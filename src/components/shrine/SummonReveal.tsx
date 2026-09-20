/**
 * SummonReveal — after the altar wakes a blade, show who answered.
 */

import { Link } from 'react-router-dom'
import { RARITY_COLORS } from '../../config/gameConfig'
import type { Delver } from '../../types/game'
import { JOB_PORTRAIT } from '../camp/campSprites'
import { RuneButton } from '../ui/RuneButton'

export function SummonReveal({
  delver,
  onWakeAnother,
  onClose,
}: {
  delver: Delver
  onWakeAnother: () => void
  onClose: () => void
}) {
  return (
    <div
      className="modal-backdrop-in fixed inset-0 z-[230] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summon-reveal-title"
      onClick={onClose}
    >
      <div className="dossier-shell fade-rise-in relative w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="vault-modal-shell">
          <button type="button" className="vault-modal-close" aria-label="Close" onClick={onClose} />
          <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[#e07070]">The offering answers</p>
          <h2 id="summon-reveal-title" className="mt-1 font-heading text-3xl text-[#f0d78c]">
            A blade kneels
          </h2>

          <div className="mt-5 flex flex-col items-center text-center">
            <img
              src={JOB_PORTRAIT[delver.jobClass]}
              alt=""
              className="h-28 w-28 pixelated drop-shadow-[0_8px_20px_rgba(0,0,0,0.75)]"
              draggable={false}
            />
            <p className="mt-4 font-heading text-2xl text-[#f0d78c]">{delver.name}</p>
            <p className="mt-1 font-body text-xs uppercase tracking-[0.18em] text-white/55">{delver.jobClass}</p>
            <p className="mt-2 font-body text-sm" style={{ color: RARITY_COLORS[delver.rarity] }}>
              {delver.rarity}
            </p>
            <p className="mt-4 max-w-xs font-body text-sm text-white/65">
              They wait at the barracks Muster Ledger — rename, arm, and seal them for the Depths.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <RuneButton type="button" glow="amethyst" onClick={onWakeAnother}>
              Wake another
            </RuneButton>
            <Link
              to="/camp"
              className="font-heading text-sm text-antique-gold transition hover:text-runeflame"
              onClick={onClose}
            >
              Open Barracks →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SummonReveal
