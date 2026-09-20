/**
 * First-load fences so the Black Market is not an empty room.
 * Seeded once, when a save has no marketListings field.
 */

import type { MarketListing } from '../types/game'
import { createItemByKey, createRandomDelver } from './delverFactory'
import { createId } from './id'

const FENCES = ['Veska the Fence', 'Old Brine', 'Sister Moth', 'Carrion Jill']

export function seedMarketListings(): MarketListing[] {
  const now = Date.now()
  const blades = [900, 1600, 2400].map((price, index) => {
    const delver = createRandomDelver()
    return {
      id: createId('listing'),
      sellerId: `fence_${index}`,
      sellerName: FENCES[index] ?? 'A smuggler',
      price,
      listedAt: now - index * 60_000,
      asset: { kind: 'delver' as const, delver },
    }
  })
  const relics: MarketListing[] = [
    {
      id: createId('listing'),
      sellerId: 'fence_relic',
      sellerName: FENCES[3] ?? 'A smuggler',
      price: 350,
      listedAt: now,
      asset: { kind: 'item', item: createItemByKey('iron_pickaxe') },
    },
    {
      id: createId('listing'),
      sellerId: 'fence_relic',
      sellerName: FENCES[3] ?? 'A smuggler',
      price: 1400,
      listedAt: now,
      asset: { kind: 'item', item: createItemByKey('runic_pickaxe') },
    },
    {
      id: createId('listing'),
      sellerId: 'fence_relic',
      sellerName: FENCES[1] ?? 'A smuggler',
      price: 700,
      listedAt: now,
      asset: { kind: 'item', item: createItemByKey('labyrinth_lantern') },
    },
  ]
  return [...blades, ...relics]
}
