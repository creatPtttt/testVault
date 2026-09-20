/**
 * DelverRosterStrip — bottom nameplate cards (primary select UI).
 * Scene silhouettes are atmosphere; cards are how you inspect a blade.
 */

import { RARITY_COLORS } from '../../config/gameConfig'
import type { Delver } from '../../types/game'
import { JOB_SPRITE } from './campSprites'

export interface DelverRosterStripProps {
  delvers: Delver[]
  activeId: string | null
  onInspect: (delver: Delver) => void
}

export function DelverRosterStrip({ delvers, activeId, onInspect }: DelverRosterStripProps) {
  if (delvers.length === 0) {
    return (
      <div className="camp-roster-strip camp-roster-strip--empty font-body">
        <p className="font-heading text-lg text-antique-gold">No Contracts Sealed</p>
        <p className="text-xs text-white/55">Offer 50 $RDAV at the Shrine to muster the fire circle.</p>
      </div>
    )
  }

  return (
    <div className="camp-roster-strip" role="list" aria-label="Vanguard roster">
      <p className="camp-roster-strip-label font-body">Vanguard Roster</p>
      <div className="camp-roster-strip-track">
        {delvers.map((delver) => {
          const rarity = RARITY_COLORS[delver.rarity]
          const sprite = JOB_SPRITE[delver.jobClass]
          const isOn = activeId === delver.id
          return (
            <button
              key={delver.id}
              type="button"
              role="listitem"
              className={`camp-roster-card ${isOn ? 'is-active' : ''}`}
              style={{ ['--rarity' as string]: rarity }}
              aria-label={`Inspect ${delver.name}`}
              onClick={() => onInspect(delver)}
            >
              <span
                className="camp-roster-card-art pixelated"
                style={{ backgroundImage: `url('${sprite}?v=9')` }}
                aria-hidden
              />
              <span className="camp-roster-card-meta">
                <span className="camp-roster-card-name font-heading">{delver.name}</span>
                <span className="camp-roster-card-job font-body">{delver.jobClass}</span>
                <span className="camp-roster-card-rarity font-body" style={{ color: rarity }}>
                  {delver.rarity}
                </span>
              </span>
              <span className="camp-roster-card-stats font-pixel">
                {delver.stats.power}
                <span className="font-body text-[9px] text-white/40"> PWR</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DelverRosterStrip
