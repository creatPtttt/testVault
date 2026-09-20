/**
 * CampFireSilhouette — dim atmosphere figure by the fire (not the main select UI).
 */

import { RARITY_COLORS } from '../../config/gameConfig'
import type { Delver } from '../../types/game'
import { JOB_SPRITE } from './campSprites'

export interface CampFireSilhouetteProps {
  delver: Delver
  left: string
  top: string
  zIndex: number
  /** Face left toward the fire when seated on the right */
  flip?: boolean
  highlighted?: boolean
  onInspect: (delver: Delver) => void
  onHoverChange?: (hovered: boolean) => void
}

export function CampFireSilhouette({
  delver,
  left,
  top,
  zIndex,
  flip = false,
  highlighted = false,
  onInspect,
  onHoverChange,
}: CampFireSilhouetteProps) {
  const sprite = JOB_SPRITE[delver.jobClass]
  const rarityColor = RARITY_COLORS[delver.rarity]

  return (
    <button
      type="button"
      className={`camp-silhouette ${highlighted ? 'is-lit' : ''} ${flip ? 'is-flipped' : ''}`}
      style={{ left, top, zIndex, ['--rarity' as string]: rarityColor }}
      aria-label={`${delver.name} rests by the fire`}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      onClick={() => onInspect(delver)}
    >
      <span className="camp-silhouette-shadow" aria-hidden />
      <span
        className="camp-silhouette-sprite pixelated"
        style={{ backgroundImage: `url('${sprite}?v=9')` }}
        aria-hidden
      />
    </button>
  )
}

export default CampFireSilhouette
