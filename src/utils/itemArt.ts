/**
 * Painted item sprites shared by the reliquary, the stash, and equipment slots.
 * Lookup is by BASE_ITEMS key, not by the Lucide type icon.
 */

import { BASE_ITEMS } from '../config/gameConfig'
import type { Item } from '../types/game'

const ITEM_SPRITE: Record<string, string> = {
  iron_pickaxe: '/assets/expeditions/loot-iron-pickaxe.png?v=1',
  runic_pickaxe: '/assets/expeditions/loot-runic-pickaxe.png?v=1',
  labyrinth_lantern: '/assets/expeditions/loot-lantern.png?v=1',
  dwarven_dynamite: '/assets/expeditions/loot-dynamite.png?v=1',
  abyssal_elixir: '/assets/expeditions/loot-elixir.png?v=1',
}

/** Sprite for a registry key, or null when this item has no painting yet */
export function itemSpriteByKey(key: string): string | null {
  return ITEM_SPRITE[key] ?? null
}

/** Match an owned item back to its template, then to the painting */
export function itemSprite(item: Pick<Item, 'name'>): string | null {
  const def = BASE_ITEMS.find((row) => row.name === item.name)
  if (!def) return null
  return itemSpriteByKey(def.key)
}

/** True for the consumable that clears a collapse */
export function isAbyssalElixir(item: Pick<Item, 'name'>): boolean {
  return BASE_ITEMS.some((row) => row.key === 'abyssal_elixir' && row.name === item.name)
}
