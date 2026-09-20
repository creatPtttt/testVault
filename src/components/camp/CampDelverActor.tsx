/**
 * CampDelverActor — animated pixel mercenary resting in the barracks yard.
 */

import { useState } from 'react'
import { RARITY_COLORS } from '../../config/gameConfig'
import type { Delver } from '../../types/game'
import { JOB_SPRITE } from './campSprites'

export interface CampDelverActorProps {
  delver: Delver
  left: string
  top: string
  zIndex: number
  onInspect: (delver: Delver) => void
  onHoverChange?: (hovered: boolean) => void
}

export function CampDelverActor({
  delver,
  left,
  top,
  zIndex,
  onInspect,
  onHoverChange,
}: CampDelverActorProps) {
  const [hovered, setHovered] = useState(false)
  const sprite = JOB_SPRITE[delver.jobClass]
  const rarityColor = RARITY_COLORS[delver.rarity]

  const setHot = (on: boolean) => {
    setHovered(on)
    onHoverChange?.(on)
  }

  return (
    <button
      type="button"
      className={`camp-actor ${hovered ? 'is-alert' : 'is-idle'}`}
      style={{ left, top, zIndex }}
      aria-label={`Inspect ${delver.name}, ${delver.jobClass}`}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      onClick={() => onInspect(delver)}
    >
      <span className="camp-actor-shadow" aria-hidden />
      <span
        className="camp-actor-sprite pixelated"
        style={{ backgroundImage: `url('${sprite}?v=8')` }}
        aria-hidden
      />
      {hovered && (
        <span className="camp-actor-plaque" role="tooltip">
          <span className="camp-actor-plaque-name font-heading">{delver.name}</span>
          <span className="camp-actor-plaque-job font-body">{delver.jobClass}</span>
          <span className="camp-actor-plaque-rarity font-body" style={{ color: rarityColor }}>
            {delver.rarity}
          </span>
          <span className="camp-actor-plaque-cta font-heading">Inspect</span>
        </span>
      )}
    </button>
  )
}

export default CampDelverActor
