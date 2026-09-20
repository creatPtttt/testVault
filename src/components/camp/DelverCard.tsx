/**
 * DelverCard — ornate mercenary plaque (not a flat wireframe tile).
 */

import { RARITY_COLORS, RARITY_DROP_SHADOWS } from '../../config/gameConfig'
import type { Delver } from '../../types/game'
import { StonePanel } from '../ui/StonePanel'
import { RuneButton } from '../ui/RuneButton'
import { JOB_ICONS } from './campIcons'

export interface DelverCardProps {
  delver: Delver
  onInspect: (delver: Delver) => void
}

export function DelverCard({ delver, onInspect }: DelverCardProps) {
  const Icon = JOB_ICONS[delver.jobClass]
  const rarityColor = RARITY_COLORS[delver.rarity]
  const glow = RARITY_DROP_SHADOWS[delver.rarity]

  return (
    <StonePanel
      className="group relative flex flex-col items-center gap-4 overflow-hidden p-6 transition-all duration-300 hover:border-runeflame hover:shadow-cardhover"
    >
      {/* Rarity ribbon across the top */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${rarityColor}, transparent)`,
          boxShadow: `0 0 12px ${rarityColor}`,
        }}
        aria-hidden
      />

      {/* Inner vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)]"
        aria-hidden
      />

      {/* Hex-ish avatar frame */}
      <div
        className="relative mt-2 flex h-24 w-24 items-center justify-center"
        aria-hidden
      >
        <div
          className="absolute inset-0 rotate-45 border-2 bg-obsidian shadow-[inset_0_2px_14px_rgba(0,0,0,0.95)]"
          style={{ borderColor: rarityColor, boxShadow: `inset 0 2px 14px rgba(0,0,0,0.95), 0 0 18px ${rarityColor}55` }}
        />
        <Icon
          className="relative z-10 h-11 w-11 transition-transform duration-300 group-hover:scale-110"
          strokeWidth={1.35}
          style={{ filter: glow, color: rarityColor }}
        />
      </div>

      <h3 className="relative z-10 text-center font-heading text-xl text-antique-gold drop-shadow-[0_0_10px_rgba(184,134,11,0.55)]">
        {delver.name}
      </h3>

      <p className="relative z-10 font-body text-sm tracking-wide text-white/70">
        {delver.jobClass}
      </p>

      <span
        className="relative z-10 border px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          color: rarityColor,
          borderColor: `${rarityColor}99`,
          textShadow: `0 0 10px ${rarityColor}`,
          background: `${rarityColor}14`,
        }}
      >
        {delver.rarity}
      </span>

      {/* Mini power readout — Silkscreen numbers */}
      <div className="relative z-10 flex gap-3 font-body text-[10px] uppercase tracking-wider text-white/45">
        <span>
          PWR <span className="font-pixel text-runeflame">{delver.stats.power}</span>
        </span>
        <span>
          MIN <span className="font-pixel text-runeflame">{delver.stats.mining}</span>
        </span>
      </div>

      <RuneButton
        type="button"
        glow="runeflame"
        className="relative z-10 mt-1 w-full"
        onClick={() => onInspect(delver)}
      >
        Inspect
      </RuneButton>
    </StonePanel>
  )
}

export default DelverCard
