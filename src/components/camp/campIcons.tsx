/**
 * Job / item icon helpers for the barracks & stash.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Axe,
  Crosshair,
  Gem,
  Package,
  Shield,
  Sparkles,
  Sword,
  WandSparkles,
} from 'lucide-react'
import type { ItemType, JobClass } from '../../types/game'

/** Map each job class to a crisp Lucide avatar glyph */
export const JOB_ICONS: Record<JobClass, LucideIcon> = {
  'Rune Arcanist': WandSparkles,
  'Breaker Paladin': Sword,
  'Ashen Rogue': Crosshair,
  'Vault Geomancer': Gem,
  'Sanity Warden': Shield,
}

/** Map item types to inventory glyphs */
export const ITEM_TYPE_ICONS: Record<ItemType, LucideIcon> = {
  pickaxe: Axe,
  armor: Shield,
  accessory: Gem,
  consumable: Sparkles,
  material: Package,
}
