/**
 * DelverLedgerCard — gothic nameplate with animated portrait GIF (no neon glyphs).
 */

import { useEffect, useState } from 'react'
import { RARITY_COLORS } from '../../config/gameConfig'
import type { Delver } from '../../types/game'
import { collapseRemaining, formatRemaining, isDelverIdle, isInjured } from '../../utils/squadPower'
import { JOB_PORTRAIT } from './campSprites'

export interface DelverLedgerCardProps {
  delver: Delver
  onInspect: (delver: Delver) => void
}

export function DelverLedgerCard({ delver, onInspect }: DelverLedgerCardProps) {
  const [now, setNow] = useState(() => Date.now())
  const rarity = RARITY_COLORS[delver.rarity]
  const portrait = JOB_PORTRAIT[delver.jobClass]
  const away = !isDelverIdle(delver, now)
  const remaining = collapseRemaining(delver, now)
  const wounded = isInjured(delver, now)
  const awayLabel = wounded
    ? `Incapacitated · ${formatRemaining(remaining)}`
    : 'On Expedition'

  useEffect(() => {
    if (!wounded) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [wounded])

  return (
    <button
      type="button"
      className={`muster-plate ${away ? 'is-away' : ''} ${wounded ? 'is-wounded' : ''}`}
      style={{ ['--rarity' as string]: rarity }}
      aria-label={`Inspect ${delver.name}, ${delver.jobClass}${away ? `, ${awayLabel}` : ''}`}
      onClick={() => onInspect(delver)}
    >
      <span className="muster-plate-frame" aria-hidden>
        <img src={`${portrait}?v=5`} alt="" className="muster-plate-gif pixelated" draggable={false} />
      </span>
      <span className="muster-plate-body">
        <span className="muster-plate-name font-heading">{delver.name}</span>
        <span className="muster-plate-job font-body">{delver.jobClass}</span>
        {away ? (
          <span className="muster-plate-away font-body">{awayLabel}</span>
        ) : (
          <span className="muster-plate-rarity font-body" style={{ color: rarity }}>
            {delver.rarity}
          </span>
        )}
        <span className="muster-plate-stats font-body">
          <span>
            PWR <span className="font-pixel text-runeflame">{delver.stats.power}</span>
          </span>
          <span>
            MIN <span className="font-pixel text-runeflame">{delver.stats.mining}</span>
          </span>
        </span>
        <span className="muster-plate-cta font-heading">Inspect</span>
      </span>
    </button>
  )
}

export default DelverLedgerCard
