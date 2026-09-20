/**
 * Keeps the connected wallet's on-chain vault in step with the pages.
 * Opening the vault may ask for one signature the first time.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import type { PlayerState } from '../types/game'
import type { ChronicleReport } from '../utils/chronicle'
import {
  ensurePlayer,
  explainFailure,
  loadSnap,
  playerPda,
  toPlayerState,
  txAdminFinish,
  txBuy,
  txCancel,
  txClaim,
  txClaimFaucet,
  txDispatch,
  txEquip,
  txImbue,
  txListDelver,
  txListItem,
  txPayCure,
  txRename,
  txSummon,
  txUnequip,
  txUseElixir,
  zoneIndex,
  type ChainSnap,
  type SendTx,
} from './rdav'

export type VaultMode = 'local' | 'loading' | 'live' | 'error'

/** Result of waking a blade on the shrine altar */
export type SummonOutcome =
  | { ok: true; name: string; id: string }
  | { ok: false; reason: string }

export interface ChainActions {
  claimFaucet: () => Promise<string | null>
  summon: () => Promise<SummonOutcome>
  rename: (id: string, name: string) => Promise<boolean>
  imbue: (id: string) => Promise<boolean>
  equip: (delverId: string, itemId: string) => Promise<boolean>
  unequip: (delverId: string, slot: number) => Promise<boolean>
  dispatch: (zoneId: string, delverIds: string[]) => Promise<boolean>
  claim: (runId: string) => Promise<ChronicleReport | null>
  cure: (delverIds: string[]) => Promise<boolean>
  elixir: (delverId: string) => Promise<boolean>
  listDelver: (id: string, price: number) => Promise<string | null>
  listItem: (id: string, price: number) => Promise<string | null>
  buy: (id: string) => Promise<string | null>
  cancel: (id: string) => Promise<boolean>
  fastForward: () => Promise<void>
}

interface Handlers {
  onLive: (player: PlayerState) => void
  onLocal: () => void
}

export function useChainVault(handlers: Handlers) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [mode, setMode] = useState<VaultMode>('local')
  const [note, setNote] = useState<string | null>(null)
  const [admin, setAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const [vaultBound, setVaultBound] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const snapRef = useRef<ChainSnap | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const wasLive = useRef(false)

  const send = useCallback<SendTx>(
    (tx, conn) =>
      sendTransaction(tx, conn, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 2,
      }),
    [sendTransaction],
  )

  const publish = useCallback(async (ownerKey: NonNullable<typeof publicKey>) => {
    const snap = await loadSnap(connection, ownerKey)
    snapRef.current = snap
    setAdmin(snap.admin.equals(ownerKey))
    handlersRef.current.onLive(toPlayerState(snap, ownerKey.toBase58()))
    setMode('live')
    setNote(null)
  }, [connection])

  useEffect(() => {
    if (!publicKey) {
      snapRef.current = null
      setAdmin(false)
      setMode('local')
      setNote(null)
      setVaultBound(false)
      if (wasLive.current) {
        wasLive.current = false
        handlersRef.current.onLocal()
      }
      return
    }

    let cancelled = false
    // React StrictMode remounts once. Wait a tick so only the last mount opens the vault.
    const timer = window.setTimeout(() => {
      setMode('loading')
      setNote('Opening the on-chain vault…')
      void (async () => {
        try {
          const playerInfo = await connection.getAccountInfo(playerPda(publicKey))
          if (cancelled) return
          if (!playerInfo) {
            setBusy(true)
            setBusyLabel('The vault will not open until the seal is marked.')
            setNote('Opening the on-chain vault. Confirm in your wallet within a few seconds.')
          }
          const kind = await ensurePlayer(connection, publicKey, send)
          if (cancelled) return
          await publish(publicKey)
          wasLive.current = true
          if (kind === 'created') setVaultBound(true)
        } catch (error) {
          if (cancelled) return
          snapRef.current = null
          setMode('error')
          setNote(await explainFailure(error))
        } finally {
          if (!cancelled) {
            setBusy(false)
            setBusyLabel(null)
          }
        }
      })()
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [connection, publicKey, publish, send, attempt])

  const retry = useCallback(async () => {
    setAttempt((n) => n + 1)
  }, [])

  const dismissVaultBound = useCallback(() => {
    setVaultBound(false)
  }, [])

  const run = useCallback(async <T,>(
    work: (snap: ChainSnap) => Promise<T>,
    fallback: T,
    label = 'The seal waits for a marked hand.',
  ): Promise<T> => {
    const owner = publicKey
    const snap = snapRef.current
    if (!owner || !snap) return fallback
    if (busy) return fallback
    setBusy(true)
    setBusyLabel(label)
    setNote(null)
    try {
      const result = await work(snap)
      await publish(owner)
      return result
    } catch (error) {
      const text = await explainFailure(error)
      setNote(text)
      if (typeof fallback === 'string') return text as T
      if (
        fallback &&
        typeof fallback === 'object' &&
        'ok' in fallback &&
        (fallback as { ok: boolean }).ok === false
      ) {
        return { ok: false, reason: text } as T
      }
      return fallback
    } finally {
      setBusy(false)
      setBusyLabel(null)
    }
  }, [busy, publicKey, publish])

  const actions = useMemo<ChainActions>(() => ({
    claimFaucet: () => run(async (snap) => {
      void snap
      await txClaimFaucet(connection, publicKey!, send)
      return null
    }, 'The vault is not open.', 'The vein will not pour until the seal is marked.'),
    summon: () => run(async (snap) => {
      const before = new Set(snap.delvers.map((delver) => delver.pubkey.toBase58()))
      await txSummon(connection, publicKey!, send, snap)
      const owner = publicKey!
      const next = await loadSnap(connection, owner)
      snapRef.current = next
      handlersRef.current.onLive(toPlayerState(next, owner.toBase58()))
      const minted = next.delvers.find((delver) => !before.has(delver.pubkey.toBase58()))
      if (!minted) {
        return { ok: false as const, reason: 'The altar took the coin but gave no blade.' }
      }
      return {
        ok: true as const,
        name: minted.name || 'Unnamed',
        id: minted.pubkey.toBase58(),
      }
    }, { ok: false as const, reason: 'The vault is not open.' }, 'Fifty coins leave the purse when the seal is struck.'),
    rename: (id, name) => run(async (snap) => {
      await txRename(connection, publicKey!, send, snap, id, name)
      return true
    }, false, 'The muster book will not rewrite itself.'),
    imbue: (id) => run(async (snap) => {
      await txImbue(connection, publicKey!, send, snap, id)
      return true
    }, false, 'The blade drinks only after the seal is struck.'),
    equip: (delverId, itemId) => run(async (snap) => {
      await txEquip(connection, publicKey!, send, snap, delverId, itemId)
      return true
    }, false, 'The relic waits for a sealed hand.'),
    unequip: (delverId, slot) => run(async (snap) => {
      await txUnequip(connection, publicKey!, send, snap, delverId, slot)
      return true
    }, false, 'The relic will not leave until the seal is marked.'),
    dispatch: (zoneId, delverIds) => run(async (snap) => {
      await txDispatch(connection, publicKey!, send, snap, zoneIndex(zoneId), delverIds)
      return true
    }, false, 'The cart will not roll until the blood mark is made.'),
    claim: (runId) => run(
      async (snap) => txClaim(connection, publicKey!, send, snap, runId),
      null,
      'The reliquary yields only to a sealed hand.',
    ),
    cure: (ids) => run(async (snap) => {
      await txPayCure(connection, publicKey!, send, snap, ids)
      return true
    }, false, 'The shrine rite waits for your mark.'),
    elixir: (id) => run(async (snap) => {
      await txUseElixir(connection, publicKey!, send, snap, id)
      return true
    }, false, 'The draught opens only under seal.'),
    listDelver: (id, price) => run(async (snap) => {
      await txListDelver(connection, publicKey!, send, snap, id, price)
      return null
    }, 'The vault is not open.', 'The smugglers wait for your nail on the contract.'),
    listItem: (id, price) => run(async (snap) => {
      await txListItem(connection, publicKey!, send, snap, id, price)
      return null
    }, 'The vault is not open.', 'The smugglers wait for your nail on the contract.'),
    buy: (id) => run(async (snap) => {
      await txBuy(connection, publicKey!, send, snap, id)
      return null
    }, 'The vault is not open.', 'The bargain holds only after the seal is struck.'),
    cancel: (id) => run(async (snap) => {
      await txCancel(connection, publicKey!, send, snap, id)
      return true
    }, false, 'The listing tears only under a marked hand.'),
    fastForward: () => run(async (snap) => {
      for (const expedition of snap.runs) {
        await txAdminFinish(connection, publicKey!, send, expedition)
      }
    }, undefined, 'The cart answers only to a sealed command.'),
  }), [connection, publicKey, run, send])

  return { mode, note, admin, actions, retry, busy, busyLabel, vaultBound, dismissVaultBound }
}
