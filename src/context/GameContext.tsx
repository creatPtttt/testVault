/**
 * RuneDelve: Abyssal Vault — PlayerState React Context + localStorage engine.
 * Handles hydrate, persist, schema migration, and safe fallbacks.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  DUNGEON_ZONES,
  ELIXIR_CURE_COST,
  FAUCET_AMOUNT,
  FAUCET_COOLDOWN_MS,
  FAUCET_DRY,
  IMBUE_COST,
  IMBUE_STAT_GAIN,
  INCAPACITATION_MS,
  LOCAL_SELLER_ID,
  MARKET_GEAR,
  MARKET_WOUNDED,
  RENAME_COST,
  SAVE_SCHEMA_VERSION,
  STORAGE_KEY,
  SUMMON_BROKE,
  SUMMON_CAP,
  SUMMON_COST,
  SUMMON_WINDOW_MS,
  SUMMONS_PER_WINDOW,
} from '../config/gameConfig'
import type { Delver, ExpeditionRun, GameSaveData, Item, ItemType, MarketListing, PlayerState } from '../types/game'
import { buildChronicle, type ChronicleReport } from '../utils/chronicle'
import { createItemByKey, createRandomDelver } from '../utils/delverFactory'
import { isAbyssalElixir } from '../utils/itemArt'
import { createId } from '../utils/id'
import { seedMarketListings } from '../utils/marketSeed'
import { hasEquippedGear, isDelverIdle, isInjured } from '../utils/squadPower'
import { useChainVault, type SummonOutcome, type VaultMode } from '../chain/useChain'

/** Map inventory item types to delver equipment slots (materials cannot equip) */
const ITEM_TYPE_TO_SLOT: Partial<Record<ItemType, keyof Delver['slots']>> = {
  pickaxe: 'pickaxe',
  armor: 'armor',
  accessory: 'accessory',
  consumable: 'consumable',
}

/** Shape of helpers + state exposed to consumers */
export interface GameContextValue {
  /** Live player snapshot */
  player: PlayerState
  /** Replace the entire player state (advanced / migrations) */
  setPlayer: (next: PlayerState | ((prev: PlayerState) => PlayerState)) => void
  /** Add $RDAV to the balance */
  addRdav: (amount: number) => void
  /** Deduct $RDAV if funds allow; returns false when insufficient */
  deductRdav: (amount: number) => boolean
  /** Append a new delver to the roster */
  addDelver: (delver: Delver) => void
  /** Patch one delver by id; no-op if id is missing */
  updateDelverState: (id: string, patch: Partial<Delver>) => void
  /** Append an item to the stash inventory */
  addItem: (item: Item) => void
  /** Set or clear the mock / real wallet address */
  setWalletAddress: (address: string | null) => void
  /** Rename a delver for RENAME_COST $RDAV. False when the chain or the purse refuses. */
  renameDelver: (id: string, newName: string) => Promise<boolean>
  /** Spend IMBUE_COST to bump stats. False when the chain or the purse refuses. */
  imbueDelver: (id: string) => Promise<boolean>
  /** Move an inventory item into a matching equipment slot on a delver */
  equipItem: (delverId: string, itemId: string) => Promise<boolean>
  /** Unequip a slot back into the stash inventory */
  unequipItem: (delverId: string, slot: keyof Delver['slots']) => Promise<boolean>
  /** Seal 1–3 idle mercenaries into a zone. False if the squad is illegal. */
  dispatchExpedition: (zoneId: string, delverIds: string[]) => Promise<boolean>
  /** Grant loot from the chain, or from the local chronicle when the wallet is off. */
  claimExpedition: (expeditionId: string) => Promise<ChronicleReport | null>
  /** Pay ELIXIR_CURE_COST once to stand the listed mercenaries back up */
  cureDelvers: (delverIds: string[]) => Promise<boolean>
  /** Spend one Abyssal Elixir from the stash to clear one collapse */
  useElixir: (delverId: string) => Promise<boolean>
  /** Snap every live cart to the chest. On devnet the admin wallet signs this. */
  fastForwardExpeditions: () => Promise<void>
  /** Consign a naked, healthy mercenary. Returns a refusal string, or null on success. */
  listDelver: (delverId: string, price: number) => Promise<string | null>
  /** Consign a stash relic for $RDAV. */
  listItem: (itemId: string, price: number) => Promise<string | null>
  /** Buy someone else's listing. 3% stays in the guild vault. */
  buyListing: (listingId: string) => Promise<string | null>
  /** Pull an unsold consignment back to the roster or stash. */
  cancelListing: (listingId: string) => Promise<boolean>
  /** Draw 10,000 $RDAV if the hour has passed. Refusal string, or null. */
  claimFaucet: () => Promise<string | null>
  /** Pay 50 $RDAV for a random mercenary. Three times an hour. */
  summonAtShrine: () => Promise<SummonOutcome>
  /** local = browser demo. live = the connected wallet's devnet vault. */
  vaultMode: VaultMode
  /** Why the vault failed to open, or a rejected signature. */
  vaultNote: string | null
  /** True when this wallet is the program admin and may skip delve timers. */
  chainAdmin: boolean
  /** Re-run the one-time vault open after a failed signature. */
  retryVault: () => Promise<void>
  /** True while Phantom holds a signature. Blocks a second strike. */
  sigilBusy: boolean
  /** Short line shown on the waiting plate. */
  sigilLabel: string | null
  /** True after a brand-new vault is sealed — show the welcome plate. */
  vaultBound: boolean
  /** Dismiss the first-open welcome plate. */
  dismissVaultBound: () => void
}

/** Fresh default player used on first launch or corrupt saves */
function createDefaultPlayerState(): PlayerState {
  // Return a brand-new empty vault owner profile
  return {
    rdavBalance: 100,
    delvers: [],
    inventory: [],
    lastLogin: new Date().toISOString(),
    walletAddress: null,
    lastFaucetAt: 0,
    summonWindowStart: 0,
    summonsInWindow: 0,
    expeditions: [],
    marketListings: seedMarketListings(),
  }
}

/** Accept only well-formed expedition rows from disk */
function isExpeditionRun(value: unknown): value is ExpeditionRun {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.zoneId === 'string' &&
    Array.isArray(row.delverIds) &&
    row.delverIds.every((id) => typeof id === 'string') &&
    typeof row.startedAt === 'number' &&
    typeof row.durationMs === 'number' &&
    (row.unsealedAt === null || typeof row.unsealedAt === 'number')
  )
}

/** Backfill status on delvers saved before Phase 3 */
function normalizeDelver(delver: Delver): Delver {
  const raw = delver as Delver & { status?: string }
  const status = raw.status === 'delving' ? 'delving' : 'idle'
  let until = delver.incapacitatedUntil ?? null
  const rawStatus = raw.status as string
  if (rawStatus === 'incapacitated' && until == null) {
    until = Date.now() + INCAPACITATION_MS.costly
  }
  if (until != null && until <= Date.now()) until = null
  return { ...delver, status, incapacitatedUntil: until }
}

function recoverDelvers(player: PlayerState, now = Date.now()): PlayerState {
  let changed = false
  const delvers = player.delvers.map((delver) => {
    if (delver.incapacitatedUntil == null || now < delver.incapacitatedUntil) return delver
    changed = true
    return { ...delver, incapacitatedUntil: null }
  })
  return changed ? { ...player, delvers } : player
}

function isMarketListing(value: unknown): value is MarketListing {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.sellerId !== 'string') return false
  if (typeof row.sellerName !== 'string' || typeof row.price !== 'number') return false
  if (!row.asset || typeof row.asset !== 'object') return false
  const asset = row.asset as Record<string, unknown>
  return asset.kind === 'delver' || asset.kind === 'item'
}

function sellerIdOf(player: PlayerState): string {
  return player.walletAddress ?? LOCAL_SELLER_ID
}

/** Normalize older saves that pre-date walletAddress */
function normalizePlayerState(raw: PlayerState): PlayerState {
  const extra = raw as PlayerState & { expeditions?: unknown; marketListings?: unknown }
  const expeditions = Array.isArray(extra.expeditions)
    ? extra.expeditions.filter(isExpeditionRun)
    : []
  const marketListings = Array.isArray(extra.marketListings)
    ? extra.marketListings.filter(isMarketListing)
    : seedMarketListings()
  return {
    ...raw,
    walletAddress: raw.walletAddress ?? null,
    lastFaucetAt: raw.lastFaucetAt ?? 0,
    summonWindowStart: raw.summonWindowStart ?? 0,
    summonsInWindow: raw.summonsInWindow ?? 0,
    delvers: (Array.isArray(raw.delvers) ? raw.delvers : []).map(normalizeDelver),
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    expeditions,
    marketListings,
  }
}

/** Build a versioned save envelope ready for JSON.stringify */
function toSaveData(player: PlayerState): GameSaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    player,
  }
}

/** Runtime guard: ensure the value looks like a PlayerState object */
function isPlayerState(value: unknown): value is PlayerState {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (typeof obj.rdavBalance !== 'number' || Number.isNaN(obj.rdavBalance)) return false
  if (!Array.isArray(obj.delvers) || !Array.isArray(obj.inventory)) return false
  if (typeof obj.lastLogin !== 'string') return false
  // walletAddress may be missing on older saves — normalize later
  return true
}

/** Runtime guard: ensure the save envelope matches the expected schema */
function isValidSaveData(value: unknown): value is GameSaveData {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (typeof obj.schemaVersion !== 'number' || !Number.isFinite(obj.schemaVersion)) return false
  if (!isPlayerState(obj.player)) return false
  return true
}

/**
 * Load player state from localStorage.
 * On missing / invalid / outdated schema → return a safe default (no white screen).
 */
function loadPlayerState(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultPlayerState()

    const parsed: unknown = JSON.parse(raw)

    if (!isValidSaveData(parsed)) {
      console.warn('[RDAV] Invalid save data — resetting to defaults.')
      return createDefaultPlayerState()
    }

    if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
      console.warn(
        `[RDAV] Unsupported schemaVersion ${parsed.schemaVersion} (expected ${SAVE_SCHEMA_VERSION}) — resetting.`,
      )
      return createDefaultPlayerState()
    }

    // Refresh lastLogin and backfill optional fields
    return normalizePlayerState({
      ...parsed.player,
      lastLogin: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[RDAV] Failed to load save — using defaults.', error)
    return createDefaultPlayerState()
  }
}

/** Persist a versioned snapshot; swallow quota / privacy mode errors */
function persistPlayerState(player: PlayerState): void {
  try {
    const payload = JSON.stringify(toSaveData(player))
    localStorage.setItem(STORAGE_KEY, payload)
  } catch (error) {
    console.warn('[RDAV] Failed to persist save.', error)
  }
}

/** React context instance (undefined until Provider mounts) */
const GameContext = createContext<GameContextValue | undefined>(undefined)

/** Props for the GameProvider wrapper */
interface GameProviderProps {
  children: ReactNode
}

/**
 * GameProvider — owns PlayerState and keeps localStorage in sync.
 */
export function GameProvider({ children }: GameProviderProps) {
  const [player, setPlayer] = useState<PlayerState>(() => loadPlayerState())
  const liveRef = useRef(false)
  const chain = useChainVault({
    onLive: (next) => {
      liveRef.current = true
      setPlayer(next)
    },
    onLocal: () => {
      liveRef.current = false
      setPlayer(loadPlayerState())
    },
  })

  useEffect(() => {
    // The chain snapshot must not overwrite the offline demo save.
    if (liveRef.current) return
    persistPlayerState(player)
  }, [player])

  useEffect(() => {
    const sweep = () => {
      if (liveRef.current) return
      setPlayer((prev) => recoverDelvers(prev))
    }
    sweep()
    const timer = window.setInterval(sweep, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const addRdav = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return
    setPlayer((prev) => ({
      ...prev,
      rdavBalance: prev.rdavBalance + amount,
    }))
  }, [])

  const deductRdav = useCallback((amount: number): boolean => {
    if (!Number.isFinite(amount) || amount <= 0) return false
    let success = false
    setPlayer((prev) => {
      if (prev.rdavBalance < amount) {
        success = false
        return prev
      }
      success = true
      return {
        ...prev,
        rdavBalance: prev.rdavBalance - amount,
      }
    })
    return success
  }, [])

  const addDelver = useCallback((delver: Delver) => {
    setPlayer((prev) => ({
      ...prev,
      delvers: [...prev.delvers, delver],
    }))
  }, [])

  const updateDelverState = useCallback((id: string, patch: Partial<Delver>) => {
    setPlayer((prev) => ({
      ...prev,
      delvers: prev.delvers.map((delver) => {
        if (delver.id !== id) return delver
        return { ...delver, ...patch, id: delver.id }
      }),
    }))
  }, [])

  const addItem = useCallback((item: Item) => {
    setPlayer((prev) => ({
      ...prev,
      inventory: [...prev.inventory, item],
    }))
  }, [])

  const setWalletAddress = useCallback((address: string | null) => {
    setPlayer((prev) => ({
      ...prev,
      walletAddress: address,
    }))
  }, [])

  const renameDelver = useCallback(async (id: string, newName: string): Promise<boolean> => {
    if (chain.mode === 'live') return chain.actions.rename(id, newName)
    if (chain.mode !== 'local') return false
    // Reject blank names
    const trimmed = newName.trim()
    if (!trimmed) return false

    let success = false
    setPlayer((prev) => {
      // Need enough $RDAV and a matching delver
      const target = prev.delvers.find((d) => d.id === id)
      if (!target || !isDelverIdle(target) || prev.rdavBalance < RENAME_COST) {
        success = false
        return prev
      }
      success = true
      return {
        ...prev,
        rdavBalance: prev.rdavBalance - RENAME_COST,
        delvers: prev.delvers.map((d) =>
          d.id === id ? { ...d, name: trimmed } : d,
        ),
      }
    })
    return success
  }, [chain.actions, chain.mode])

  const imbueDelver = useCallback(async (id: string): Promise<boolean> => {
    if (chain.mode === 'live') return chain.actions.imbue(id)
    if (chain.mode !== 'local') return false
    let success = false
    setPlayer((prev) => {
      const target = prev.delvers.find((d) => d.id === id)
      if (!target || !isDelverIdle(target) || prev.rdavBalance < IMBUE_COST) {
        success = false
        return prev
      }
      success = true
      // Bump every combat stat; clamp sanity to 100
      const nextStats = {
        mining: target.stats.mining + IMBUE_STAT_GAIN,
        power: target.stats.power + IMBUE_STAT_GAIN,
        armor: target.stats.armor + IMBUE_STAT_GAIN,
        luck: target.stats.luck + IMBUE_STAT_GAIN,
        speed: target.stats.speed + IMBUE_STAT_GAIN,
        sanity: Math.min(100, target.stats.sanity + IMBUE_STAT_GAIN),
      }
      return {
        ...prev,
        rdavBalance: prev.rdavBalance - IMBUE_COST,
        delvers: prev.delvers.map((d) =>
          d.id === id ? { ...d, stats: nextStats } : d,
        ),
      }
    })
    return success
  }, [chain.actions, chain.mode])

  const equipItem = useCallback(async (delverId: string, itemId: string): Promise<boolean> => {
    if (chain.mode === 'live') return chain.actions.equip(delverId, itemId)
    if (chain.mode !== 'local') return false
    let success = false
    setPlayer((prev) => {
      const delver = prev.delvers.find((d) => d.id === delverId)
      const item = prev.inventory.find((i) => i.id === itemId)
      if (!delver || !isDelverIdle(delver) || !item) {
        success = false
        return prev
      }
      const slot = ITEM_TYPE_TO_SLOT[item.type]
      if (!slot) {
        success = false
        return prev
      }
      success = true
      const previous = delver.slots[slot]
      const nextInventory = prev.inventory.filter((i) => i.id !== itemId)
      // Swap: previously equipped gear returns to the stash
      if (previous) nextInventory.push(previous)
      return {
        ...prev,
        inventory: nextInventory,
        delvers: prev.delvers.map((d) =>
          d.id === delverId
            ? { ...d, slots: { ...d.slots, [slot]: item } }
            : d,
        ),
      }
    })
    return success
  }, [chain.actions, chain.mode])

  const unequipItem = useCallback(async (delverId: string, slot: keyof Delver['slots']): Promise<boolean> => {
    if (chain.mode === 'live') {
      const index = slot === 'pickaxe' ? 0 : slot === 'armor' ? 1 : slot === 'accessory' ? 2 : 3
      return chain.actions.unequip(delverId, index)
    }
    if (chain.mode !== 'local') return false
    let success = false
    setPlayer((prev) => {
      const delver = prev.delvers.find((d) => d.id === delverId)
      const equipped = delver?.slots[slot]
      if (!delver || !isDelverIdle(delver) || !equipped) {
        success = false
        return prev
      }
      success = true
      return {
        ...prev,
        inventory: [...prev.inventory, equipped],
        delvers: prev.delvers.map((d) =>
          d.id === delverId
            ? { ...d, slots: { ...d.slots, [slot]: null } }
            : d,
        ),
      }
    })
    return success
  }, [chain.actions, chain.mode])

  const dispatchExpedition = useCallback(async (zoneId: string, delverIds: string[]): Promise<boolean> => {
    if (chain.mode === 'live') return chain.actions.dispatch(zoneId, delverIds)
    if (chain.mode !== 'local') return false
    const zone = DUNGEON_ZONES.find((entry) => entry.id === zoneId)
    const unique = [...new Set(delverIds)]
    if (!zone || unique.length === 0 || unique.length > 3) return false

    let success = false
    setPlayer((prev) => {
      const chosen = unique
        .map((id) => prev.delvers.find((delver) => delver.id === id))
        .filter((delver): delver is Delver => Boolean(delver))
      if (chosen.length !== unique.length || chosen.some((delver) => !isDelverIdle(delver))) {
        success = false
        return prev
      }
      success = true
      const run: ExpeditionRun = {
        id: createId('expedition'),
        zoneId: zone.id,
        delverIds: unique,
        startedAt: Date.now(),
        durationMs: zone.durationMinutes * 60_000,
        unsealedAt: null,
      }
      return {
        ...prev,
        expeditions: [...prev.expeditions, run],
        delvers: prev.delvers.map((delver) =>
          unique.includes(delver.id) ? { ...delver, status: 'delving' } : delver,
        ),
      }
    })
    return success
  }, [chain.actions, chain.mode])

  const claimExpedition = useCallback(async (expeditionId: string): Promise<ChronicleReport | null> => {
    if (chain.mode === 'live') return chain.actions.claim(expeditionId)
    if (chain.mode !== 'local') return null
    let report: ChronicleReport | null = null
    setPlayer((prev) => {
      const run = prev.expeditions.find((entry) => entry.id === expeditionId)
      if (!run || run.unsealedAt !== null) return prev
      if (Date.now() - run.startedAt < run.durationMs) return prev
      const squad = run.delverIds
        .map((id) => prev.delvers.find((delver) => delver.id === id))
        .filter((delver): delver is Delver => Boolean(delver))
      if (squad.length === 0) return prev
      report = buildChronicle(run, squad)
      const minted = report.itemKeys.map((key) => createItemByKey(key))
      const down = new Set(report.incapacitatedIds)
      const byId = new Map(report.deltas.map((row) => [row.delverId, row]))
      const fallenUntil = Date.now() + report.downForMs
      return {
        ...prev,
        rdavBalance: prev.rdavBalance + report.rdav,
        inventory: [...prev.inventory, ...minted],
        expeditions: prev.expeditions.map((entry) =>
          entry.id === expeditionId ? { ...entry, unsealedAt: Date.now() } : entry,
        ),
        delvers: prev.delvers.map((delver) => {
          const delta = byId.get(delver.id)
          if (!delta) return delver
          return {
            ...delver,
            status: 'idle',
            incapacitatedUntil: down.has(delver.id) ? fallenUntil : null,
            lifetimeStats: {
              dungeonsCleared: delver.lifetimeStats.dungeonsCleared + delta.dungeonsCleared,
              rdavEarned: delver.lifetimeStats.rdavEarned + delta.rdavEarned,
              oreExtracted: delver.lifetimeStats.oreExtracted + delta.oreExtracted,
              damageTaken: delver.lifetimeStats.damageTaken + delta.damageTaken,
              hoursDelved: delver.lifetimeStats.hoursDelved + delta.hoursDelved,
            },
          }
        }),
      }
    })
    return report
  }, [chain.actions, chain.mode])

  const cureDelvers = useCallback(async (delverIds: string[]): Promise<boolean> => {
    if (chain.mode === 'live') return chain.actions.cure(delverIds)
    if (chain.mode !== 'local') return false
    const targets = new Set(delverIds)
    let success = false
    setPlayer((prev) => {
      const wounded = prev.delvers.filter(
        (delver) => targets.has(delver.id) && isInjured(delver),
      )
      if (wounded.length === 0 || prev.rdavBalance < ELIXIR_CURE_COST) {
        success = false
        return prev
      }
      success = true
      const heal = new Set(wounded.map((delver) => delver.id))
      return {
        ...prev,
        rdavBalance: prev.rdavBalance - ELIXIR_CURE_COST,
        delvers: prev.delvers.map((delver) =>
          heal.has(delver.id) ? { ...delver, incapacitatedUntil: null } : delver,
        ),
      }
    })
    return success
  }, [chain.actions, chain.mode])

  const useElixir = useCallback(async (delverId: string): Promise<boolean> => {
    if (chain.mode === 'live') return chain.actions.elixir(delverId)
    if (chain.mode !== 'local') return false
    let success = false
    setPlayer((prev) => {
      const delver = prev.delvers.find((entry) => entry.id === delverId)
      const elixirIndex = prev.inventory.findIndex((item) => isAbyssalElixir(item))
      if (!delver || !isInjured(delver) || elixirIndex < 0) {
        success = false
        return prev
      }
      success = true
      const inventory = prev.inventory.filter((_, index) => index !== elixirIndex)
      return {
        ...prev,
        inventory,
        delvers: prev.delvers.map((entry) =>
          entry.id === delverId
            ? { ...entry, incapacitatedUntil: null }
            : entry,
        ),
      }
    })
    return success
  }, [chain.actions, chain.mode])

  const fastForwardExpeditions = useCallback(async () => {
    if (chain.mode === 'live') {
      await chain.actions.fastForward()
      return
    }
    if (chain.mode !== 'local') return
    const now = Date.now()
    setPlayer((prev) => ({
      ...prev,
      expeditions: prev.expeditions.map((run) =>
        run.unsealedAt !== null ? run : { ...run, startedAt: now - run.durationMs },
      ),
    }))
  }, [chain.actions, chain.mode])

  const listDelver = useCallback(async (delverId: string, price: number): Promise<string | null> => {
    if (chain.mode === 'live') return chain.actions.listDelver(delverId, price)
    if (chain.mode !== 'local') return chain.note ?? 'The vault is not open.'
    if (!Number.isFinite(price) || price <= 0) return 'Name a price in $RDAV.'
    let refusal: string | null = null
    setPlayer((prev) => {
      const delver = prev.delvers.find((entry) => entry.id === delverId)
      if (!delver) {
        refusal = 'That blade is not in the barracks.'
        return prev
      }
      if (isInjured(delver)) {
        refusal = MARKET_WOUNDED
        return prev
      }
      if (hasEquippedGear(delver)) {
        refusal = MARKET_GEAR
        return prev
      }
      if (delver.status === 'delving') {
        refusal = 'They are still in the depths.'
        return prev
      }
      refusal = null
      const listing: MarketListing = {
        id: createId('listing'),
        sellerId: sellerIdOf(prev),
        sellerName: 'You',
        price: Math.floor(price),
        listedAt: Date.now(),
        asset: { kind: 'delver', delver },
      }
      return {
        ...prev,
        delvers: prev.delvers.filter((entry) => entry.id !== delverId),
        marketListings: [...prev.marketListings, listing],
      }
    })
    return refusal
  }, [chain.actions, chain.mode, chain.note])

  const listItem = useCallback(async (itemId: string, price: number): Promise<string | null> => {
    if (chain.mode === 'live') return chain.actions.listItem(itemId, price)
    if (chain.mode !== 'local') return chain.note ?? 'The vault is not open.'
    if (!Number.isFinite(price) || price <= 0) return 'Name a price in $RDAV.'
    let refusal: string | null = null
    setPlayer((prev) => {
      const item = prev.inventory.find((entry) => entry.id === itemId)
      if (!item) {
        refusal = 'That relic is not in the stash.'
        return prev
      }
      refusal = null
      const listing: MarketListing = {
        id: createId('listing'),
        sellerId: sellerIdOf(prev),
        sellerName: 'You',
        price: Math.floor(price),
        listedAt: Date.now(),
        asset: { kind: 'item', item },
      }
      return {
        ...prev,
        inventory: prev.inventory.filter((entry) => entry.id !== itemId),
        marketListings: [...prev.marketListings, listing],
      }
    })
    return refusal
  }, [chain.actions, chain.mode, chain.note])

  const buyListing = useCallback(async (listingId: string): Promise<string | null> => {
    if (chain.mode === 'live') return chain.actions.buy(listingId)
    if (chain.mode !== 'local') return chain.note ?? 'The vault is not open.'
    let refusal: string | null = 'That consignment is gone.'
    setPlayer((prev) => {
      const listing = prev.marketListings.find((entry) => entry.id === listingId)
      if (!listing) {
        refusal = 'That consignment is gone.'
        return prev
      }
      if (listing.sellerId === sellerIdOf(prev)) {
        refusal = 'That consignment is yours. Revoke it instead.'
        return prev
      }
      if (prev.rdavBalance < listing.price) {
        refusal = 'The treasury cannot pay this price.'
        return prev
      }
      refusal = null
      const next: PlayerState = {
        ...prev,
        rdavBalance: prev.rdavBalance - listing.price,
        marketListings: prev.marketListings.filter((entry) => entry.id !== listingId),
      }
      if (listing.asset.kind === 'delver') {
        next.delvers = [...prev.delvers, listing.asset.delver]
      } else {
        next.inventory = [...prev.inventory, listing.asset.item]
      }
      return next
    })
    return refusal
  }, [chain.actions, chain.mode, chain.note])

  const cancelListing = useCallback(async (listingId: string): Promise<boolean> => {
    if (chain.mode === 'live') return chain.actions.cancel(listingId)
    if (chain.mode !== 'local') return false
    let success = false
    setPlayer((prev) => {
      const listing = prev.marketListings.find((entry) => entry.id === listingId)
      if (!listing || listing.sellerId !== sellerIdOf(prev)) {
        success = false
        return prev
      }
      success = true
      const next: PlayerState = {
        ...prev,
        marketListings: prev.marketListings.filter((entry) => entry.id !== listingId),
      }
      if (listing.asset.kind === 'delver') next.delvers = [...prev.delvers, listing.asset.delver]
      else next.inventory = [...prev.inventory, listing.asset.item]
      return next
    })
    return success
  }, [chain.actions, chain.mode])

  const claimFaucet = useCallback(async (): Promise<string | null> => {
    if (chain.mode === 'live') return chain.actions.claimFaucet()
    if (chain.mode !== 'local') return chain.note ?? 'The vault is not open.'
    let refusal: string | null = null
    setPlayer((prev) => {
      const now = Date.now()
      if (prev.lastFaucetAt !== 0 && now < prev.lastFaucetAt + FAUCET_COOLDOWN_MS) {
        refusal = FAUCET_DRY
        return prev
      }
      refusal = null
      return {
        ...prev,
        rdavBalance: prev.rdavBalance + FAUCET_AMOUNT,
        lastFaucetAt: now,
      }
    })
    return refusal
  }, [chain.actions, chain.mode, chain.note])

  const summonAtShrine = useCallback(async (): Promise<SummonOutcome> => {
    if (chain.mode === 'live') return chain.actions.summon()
    if (chain.mode !== 'local') {
      return { ok: false, reason: chain.note ?? 'The vault is not open.' }
    }

    const snapshot = player
    const now = Date.now()
    const windowOpen = snapshot.summonWindowStart !== 0 && now < snapshot.summonWindowStart + SUMMON_WINDOW_MS
    const used = windowOpen ? snapshot.summonsInWindow : 0
    if (used >= SUMMONS_PER_WINDOW) return { ok: false, reason: SUMMON_CAP }
    if (snapshot.rdavBalance < SUMMON_COST) return { ok: false, reason: SUMMON_BROKE }

    const delver = createRandomDelver()
    setPlayer((prev) => ({
      ...prev,
      rdavBalance: prev.rdavBalance - SUMMON_COST,
      summonWindowStart: windowOpen ? prev.summonWindowStart : now,
      summonsInWindow: used + 1,
      delvers: [...prev.delvers, delver],
    }))
    return { ok: true, name: delver.name, id: delver.id }
  }, [chain.actions, chain.mode, chain.note, player])

  const value = useMemo<GameContextValue>(
    () => ({
      player,
      setPlayer,
      addRdav,
      deductRdav,
      addDelver,
      updateDelverState,
      addItem,
      setWalletAddress,
      renameDelver,
      imbueDelver,
      equipItem,
      unequipItem,
      dispatchExpedition,
      claimExpedition,
      cureDelvers,
      useElixir,
      fastForwardExpeditions,
      listDelver,
      listItem,
      buyListing,
      cancelListing,
      claimFaucet,
      summonAtShrine,
      vaultMode: chain.mode,
      vaultNote: chain.note,
      chainAdmin: chain.admin,
      retryVault: chain.retry,
      sigilBusy: chain.busy,
      sigilLabel: chain.busyLabel,
      vaultBound: chain.vaultBound,
      dismissVaultBound: chain.dismissVaultBound,
    }),
    [
      player,
      addRdav,
      deductRdav,
      addDelver,
      updateDelverState,
      addItem,
      setWalletAddress,
      renameDelver,
      imbueDelver,
      equipItem,
      unequipItem,
      dispatchExpedition,
      claimExpedition,
      cureDelvers,
      useElixir,
      fastForwardExpeditions,
      listDelver,
      listItem,
      buyListing,
      cancelListing,
      claimFaucet,
      summonAtShrine,
      chain.mode,
      chain.note,
      chain.admin,
      chain.retry,
      chain.busy,
      chain.busyLabel,
      chain.vaultBound,
      chain.dismissVaultBound,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

/**
 * useGame — typed accessor for GameContext.
 * Throws a clear error if used outside GameProvider (dev-time safety).
 */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return ctx
}
