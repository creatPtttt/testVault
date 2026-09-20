/**
 * Full-screen wait while the wallet holds a signature.
 * Blocks a second click so the vault does not open two contracts.
 */

import { useGame } from '../context/GameContext'

export function SigilAwait() {
  const { sigilBusy, sigilLabel } = useGame()
  if (!sigilBusy) return null

  return (
    <div className="sigil-await" role="status" aria-live="polite">
      <div className="sigil-await-plate">
        <img
          src="/assets/ui/brand-rune-seal.png?v=3"
          alt=""
          className="sigil-await-seal pixelated"
          draggable={false}
        />
        <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[#e07070]">Blood contract</p>
        <h2 className="font-heading text-3xl text-[#f0d78c]">The Sigil Awaits</h2>
        <p className="mt-2 max-w-sm font-body text-sm text-white/70">
          {sigilLabel ?? 'The seal waits for a marked hand.'}
        </p>
        <p className="mt-3 font-body text-[10px] uppercase tracking-[0.18em] text-white/40">
          Confirm in your wallet · strike once
        </p>
      </div>
    </div>
  )
}
