/**
 * First-time vault open success — the seal is struck, then the player enters.
 */

import { useGame } from '../context/GameContext'
import { RuneButton } from './ui/RuneButton'

export function VaultBound() {
  const { vaultBound, dismissVaultBound, player } = useGame()
  if (!vaultBound) return null

  const short =
    player.walletAddress != null
      ? `${player.walletAddress.slice(0, 4)}…${player.walletAddress.slice(-4)}`
      : 'your sigil'

  return (
    <div className="sigil-await vault-bound" role="status" aria-live="polite">
      <div className="sigil-await-plate">
        <img
          src="/assets/ui/brand-rune-seal.png?v=3"
          alt=""
          className="sigil-await-seal is-struck pixelated"
          draggable={false}
        />
        <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[#7ec8a0]">Sigil bound</p>
        <h2 className="font-heading text-3xl text-[#f0d78c]">The Vault Opens</h2>
        <p className="mt-2 max-w-sm font-body text-sm text-white/70">
          The blood contract holds. {short} is marked on the ledger. Your Devnet purse is ready.
        </p>
        <p className="mt-3 font-body text-[10px] uppercase tracking-[0.18em] text-white/40">
          Walk the sanctum · wake a blade · seal a descent
        </p>
        <div className="mt-5 flex justify-center">
          <RuneButton type="button" glow="runeflame" onClick={dismissVaultBound}>
            Enter the sanctum
          </RuneButton>
        </div>
      </div>
    </div>
  )
}

export default VaultBound
