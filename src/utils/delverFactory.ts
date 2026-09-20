/**
 * Factories for random delvers and stash items (DevTool / barracks / loot).
 * All templates come from gameConfig — never hardcode item stats here.
 */

import {
  BASE_ITEMS,
  DELVER_NAME_POOL,
  getBaseItem,
  JOB_CLASSES,
  PERSONALITY_ORDER,
  RARITY_MULTIPLIERS,
  RARITY_ROLL_WEIGHTS,
  type BaseItemDef,
} from '../config/gameConfig'
import type {
  Delver,
  DelverStats,
  Item,
  JobClass,
  Rarity,
} from '../types/game'
import { createId } from './id'

/** All job class keys for random picks */
const JOB_LIST = Object.keys(JOB_CLASSES) as JobClass[]

/** Pick a random element from a non-empty array */
function pickRandom<T>(list: readonly T[]): T {
  if (list.length === 0) throw new Error('Cannot pick from empty list')
  return list[Math.floor(Math.random() * list.length)]!
}

/** Weighted rarity roll using RARITY_ROLL_WEIGHTS from config */
function rollRarity(): Rarity {
  const total = RARITY_ROLL_WEIGHTS.reduce((sum, row) => sum + row.weight, 0)
  let ticket = Math.random() * total
  for (const row of RARITY_ROLL_WEIGHTS) {
    ticket -= row.weight
    if (ticket <= 0) return row.rarity
  }
  return 'Common'
}

/** Scale job base stats by rarity multiplier; clamp sanity to 0–100 */
function buildStats(jobClass: JobClass, rarity: Rarity): DelverStats {
  const base = JOB_CLASSES[jobClass]
  const mult = RARITY_MULTIPLIERS[rarity]
  return {
    mining: Math.round(base.mining * mult),
    power: Math.round(base.power * mult),
    armor: Math.round(base.armor * mult),
    luck: Math.round(base.luck * mult),
    speed: Math.round(base.speed * mult),
    sanity: Math.min(100, Math.max(0, Math.round(base.sanity))),
  }
}

/**
 * Generate a fully formed random Delver (Common → Abyssal).
 * Used by the DevTool "Roll Random Delver" action.
 */
export function createRandomDelver(): Delver {
  const rarity = rollRarity()
  const jobClass = pickRandom(JOB_LIST)
  const personality = pickRandom(PERSONALITY_ORDER)
  const name = pickRandom(DELVER_NAME_POOL)

  return {
    id: createId('delver'),
    name,
    rarity,
    jobClass,
    stats: buildStats(jobClass, rarity),
    personality,
    slots: {
      pickaxe: null,
      armor: null,
      accessory: null,
      consumable: null,
    },
    lifetimeStats: {
      dungeonsCleared: 0,
      rdavEarned: 0,
      oreExtracted: 0,
      damageTaken: 0,
      hoursDelved: 0,
    },
    status: 'idle',
    incapacitatedUntil: null,
  }
}

/** Mint an owned Item instance from a BASE_ITEMS template */
export function createItemFromBase(def: BaseItemDef): Item {
  return {
    id: createId('item'),
    type: def.type,
    name: def.name,
    rarity: def.rarity,
    stats: { ...def.stats },
    durability: def.durability,
  }
}

/** Mint by stable registry key; throws if key is unknown */
export function createItemByKey(key: string): Item {
  const def = getBaseItem(key)
  if (!def) throw new Error(`Unknown BASE_ITEMS key: ${key}`)
  return createItemFromBase(def)
}

/**
 * Create a Common Iron Pickaxe from the BASE_ITEMS registry.
 */
export function createIronPickaxe(): Item {
  return createItemByKey('iron_pickaxe')
}

/** All base-item keys (for DevTool / loot debug menus) */
export const BASE_ITEM_KEYS = BASE_ITEMS.map((row) => row.key)
