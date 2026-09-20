/**
 * ItemGlyph — painted relic when we have one, Lucide fallback otherwise.
 */

import { RARITY_COLORS } from '../../config/gameConfig'
import type { Item } from '../../types/game'
import { itemSprite } from '../../utils/itemArt'
import { ITEM_TYPE_ICONS } from '../camp/campIcons'

export function ItemGlyph({ item }: { item: Item }) {
  const sprite = itemSprite(item)
  if (sprite) {
    return <img src={sprite} alt="" className="loot-icon pixelated" draggable={false} />
  }
  const Icon = ITEM_TYPE_ICONS[item.type]
  const color = RARITY_COLORS[item.rarity]
  return (
    <Icon
      className="h-7 w-7"
      strokeWidth={1.5}
      style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}
      aria-hidden
    />
  )
}
