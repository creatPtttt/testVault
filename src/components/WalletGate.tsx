/**
 * Blocks a building until a Devnet wallet has opened its on-chain vault.
 * The town map itself stays open so players can look around first.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useGame } from '../context/GameContext'
import { RuneButton } from './ui/RuneButton'

const FAUCET_URL = 'https://faucet.solana.com'

export function WalletGate({ children, place }: { children: ReactNode; place: string }) {
  const { connected, connecting } = useWallet()
  const { setVisible } = useWalletModal()
  const { vaultMode, vaultNote, retryVault } = useGame()

  if (vaultMode === 'live') return <>{children}</>

  const title =
    connecting || vaultMode === 'loading'
      ? 'Opening the vault…'
      : vaultMode === 'error'
        ? 'The vault could not open'
        : `Bind a wallet to enter ${place}`

  return (
    <main className="relative flex min-h-[calc(100vh-3.25rem)] items-center justify-center px-4 py-10">
      <div className="vault-modal-shell w-full max-w-xl">
        <div className="vault-modal-body space-y-4 text-center">
          <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[#e07070]">Devnet beta · not Mainnet</p>
          <h1 className="font-heading text-3xl text-[#f0d78c]">{title}</h1>
          <p className="font-body text-sm text-white/70">
            You can walk the Sanctum free. To use a building you need a spare Phantom wallet on{' '}
            <span className="text-antique-gold">Solana Devnet</span>. An empty wallet is fine — you do{' '}
            <span className="text-antique-gold">not</span> need real Mainnet SOL.
          </p>

          <ol className="space-y-2 text-left font-body text-sm text-white/75">
            <li>1. Install Phantom and create a new test account (a small spare wallet is best).</li>
            <li>
              2. Open Phantom → Settings → Developer Settings → turn on Testnet Mode, then pick{' '}
              <span className="text-antique-gold">Solana Devnet</span> (not Mainnet, not Testnet).
            </li>
            <li>
              3. With that empty Devnet wallet, claim free <span className="text-antique-gold">Devnet SOL</span> at{' '}
              <a className="text-runeflame underline" href={FAUCET_URL} target="_blank" rel="noreferrer">
                faucet.solana.com
              </a>
              . This is fake test coin. It has no real value.
            </li>
            <li>
              4. Come back, bind the sigil, and approve the one-time vault open. That costs about{' '}
              <span className="text-antique-gold">0.015 Devnet SOL</span> rent plus a tiny Devnet fee — still not Mainnet
              money.
            </li>
          </ol>

          {vaultNote && (
            <p className="rounded border border-[#e07070]/40 bg-black/40 px-3 py-2 font-body text-xs text-[#e07070]">
              {vaultNote}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!connected && (
              <RuneButton type="button" glow="runeflame" onClick={() => setVisible(true)}>
                Bind Sigil
              </RuneButton>
            )}
            {connected && vaultMode === 'error' && (
              <RuneButton type="button" glow="runeflame" onClick={() => void retryVault()}>
                Try again
              </RuneButton>
            )}
            {(connecting || vaultMode === 'loading') && (
              <p className="font-body text-xs text-antique-gold">Approve in Phantom within a few seconds…</p>
            )}
            <a
              className="font-body text-xs uppercase tracking-[0.16em] text-antique-gold/80 underline"
              href={FAUCET_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open Devnet SOL faucet
            </a>
            <Link
              to="/town"
              className="font-body text-xs uppercase tracking-[0.16em] text-white/50 underline"
            >
              Back to Sanctum
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
