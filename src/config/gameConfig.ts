/**
 * RuneDelve: Abyssal Vault — Single source of truth for lore, names, and balance.
 * These registries map 1:1 to future Solana program `u8` enums / PDA seeds.
 * Never hardcode these strings or indices inside UI components.
 */

import type { DelverStats, ItemStats, ItemType, JobClass, Rarity } from '../types/game'

/** Convenience alias for iterating DelverStats keys (StatBar caps, etc.) */
type StatKey = keyof DelverStats

/** Personality index — mirrors on-chain `u8` (0..=4) */
export type PersonalityIndex = 0 | 1 | 2 | 3 | 4

/** Danger tier for expedition zones — mirrors on-chain difficulty band */
export type DangerLevel = 'Low' | 'Medium' | 'High' | 'Extreme'

/** Current persistence schema version expected by GameContext */
export const SAVE_SCHEMA_VERSION = 1 as const

/** Storage key used by the localStorage engine */
export const STORAGE_KEY = 'rdav_game_save_v1'

/**
 * Base stats per job class before rarity multipliers are applied.
 * Sanity starts mid-range so early runs feel tense but playable.
 */
export const JOB_CLASSES: Record<JobClass, DelverStats> = {
  'Rune Arcanist': {
    mining: 12,
    power: 10,
    armor: 6,
    luck: 14,
    speed: 9,
    sanity: 70,
  },
  'Breaker Paladin': {
    mining: 8,
    power: 14,
    armor: 16,
    luck: 6,
    speed: 7,
    sanity: 80,
  },
  'Ashen Rogue': {
    mining: 10,
    power: 11,
    armor: 7,
    luck: 16,
    speed: 15,
    sanity: 65,
  },
  'Vault Geomancer': {
    mining: 18,
    power: 8,
    armor: 9,
    luck: 10,
    speed: 8,
    sanity: 75,
  },
  'Sanity Warden': {
    mining: 7,
    power: 9,
    armor: 12,
    luck: 8,
    speed: 10,
    sanity: 95,
  },
}

/**
 * Multipliers applied to JOB_CLASSES base stats by rarity tier.
 * Abyssal is intentionally a large jump for late-game chase.
 */
export const RARITY_MULTIPLIERS: Record<Rarity, number> = {
  Common: 1.0,
  Uncommon: 1.15,
  Rare: 1.35,
  Epic: 1.6,
  Legendary: 2.0,
  Abyssal: 2.75,
}

/** Ordered rarity list for iteration / UI legends */
export const RARITY_ORDER: Rarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Abyssal',
]

/**
 * Personality registry — index maps to Solana `u8` enum.
 * Delver.personality MUST be one of these keys.
 */
export interface PersonalityDef {
  /** On-chain / save index */
  index: PersonalityIndex
  /** Codex name shown in dossiers */
  name: string
  /** Mechanical blurb (yield, risk, power, etc.) */
  desc: string
}

export const PERSONALITIES: Record<PersonalityIndex, PersonalityDef> = {
  0: {
    index: 0,
    name: 'Avaricious',
    desc: 'Yield +20%, Encounter Risk +10%',
  },
  1: {
    index: 1,
    name: 'Vigilant',
    desc: 'Yield -10%, Injury Avoidance +50%',
  },
  2: {
    index: 2,
    name: 'Wrathful',
    desc: 'Combat Power +25%',
  },
  3: {
    index: 3,
    name: 'Stoic',
    desc: 'Trap/Hazard Immunity +30%',
  },
  4: {
    index: 4,
    name: 'Reckless',
    desc: 'Expedition Time -15%, Injury Risk +15%',
  },
}

/** Ordered personality indices for random rolls / enum iteration */
export const PERSONALITY_ORDER: PersonalityIndex[] = [0, 1, 2, 3, 4]

/**
 * @deprecated Prefer PERSONALITIES — kept as a thin alias for older imports.
 * `summary` mirrors `desc` so existing dossier copy keeps working.
 */
export const PERSONALITY_TRAITS: Record<
  PersonalityIndex,
  { name: string; summary: string }
> = {
  0: { name: PERSONALITIES[0].name, summary: PERSONALITIES[0].desc },
  1: { name: PERSONALITIES[1].name, summary: PERSONALITIES[1].desc },
  2: { name: PERSONALITIES[2].name, summary: PERSONALITIES[2].desc },
  3: { name: PERSONALITIES[3].name, summary: PERSONALITIES[3].desc },
  4: { name: PERSONALITIES[4].name, summary: PERSONALITIES[4].desc },
}

/** Static definition for an idle dungeon / expedition zone */
export interface DungeonZoneConfig {
  /** Stable zone key (PDA seed / enum string) */
  id: string
  /** Player-facing zone title */
  name: string
  /** Base expedition duration in minutes before speed modifiers */
  durationMinutes: number
  /** Minimum party power required to attempt this zone */
  requiredPower: number
  /** Lore / UI danger band */
  dangerLevel: DangerLevel
}

/**
 * Expedition maps — order is the on-chain zone enum order.
 * Zone 1 is the starter delve referenced by the Gate grimoire.
 */
export const DUNGEON_ZONES: DungeonZoneConfig[] = [
  {
    id: 'zone_1',
    name: 'The Sunken Tunnels',
    durationMinutes: 5,
    requiredPower: 0,
    dangerLevel: 'Low',
  },
  {
    id: 'zone_2',
    name: 'Dwarven Crystal Vaults',
    durationMinutes: 30,
    requiredPower: 200,
    dangerLevel: 'Medium',
  },
  {
    id: 'zone_3',
    name: 'The Magma Crucible',
    durationMinutes: 120,
    requiredPower: 600,
    dangerLevel: 'High',
  },
  {
    id: 'zone_4',
    name: 'The Void Abyss',
    durationMinutes: 480,
    requiredPower: 1500,
    dangerLevel: 'Extreme',
  },
]

/** First starter zone — GatePage grimoire / early UX */
export const STARTER_ZONE = DUNGEON_ZONES[0]!

/** Summoning altar seats per expedition */
export const SQUAD_SIZE = 3

/**
 * Reliquary loot-chest tiers — index maps to future `u8` chest enum.
 * Higher index = richer unseal table.
 */
export const RELIQUARIES = [
  'Rusted Lockbox',
  'Bronze Strongbox',
  'Mithril Coffer',
  'Gilded Reliquary',
  'Abyssal Vault',
] as const

export type ReliquaryName = (typeof RELIQUARIES)[number]

/** One weighted row in a zone's chest. `itemKey` null means the roll is coin only. */
export interface LootRoll {
  /** BASE_ITEMS key, or null when this weight is a dry pull */
  itemKey: string | null
  weight: number
}

/** Explicit drop pool for one dungeon. Keys must exist on BASE_ITEMS. */
export interface ZoneLootTable {
  /** Chest index into RELIQUARIES */
  reliquaryIndex: number
  /** $RDAV span before personality yield */
  rdavMin: number
  rdavMax: number
  /** How many times the table is rolled on a clean success */
  rolls: number
  table: LootRoll[]
}

/**
 * Low mouths pay in iron and dynamite. High mouths pay in runic steel and lanterns.
 * Indices match DUNGEON_ZONES order.
 */
export const ZONE_LOOT: Record<string, ZoneLootTable> = {
  zone_1: {
    reliquaryIndex: 0,
    rdavMin: 30,
    rdavMax: 90,
    rolls: 2,
    table: [
      { itemKey: 'iron_pickaxe', weight: 40 },
      { itemKey: 'dwarven_dynamite', weight: 35 },
      { itemKey: null, weight: 25 },
    ],
  },
  zone_2: {
    reliquaryIndex: 1,
    rdavMin: 80,
    rdavMax: 220,
    rolls: 2,
    table: [
      { itemKey: 'iron_pickaxe', weight: 34 },
      { itemKey: 'dwarven_dynamite', weight: 34 },
      { itemKey: null, weight: 32 },
    ],
  },
  zone_3: {
    reliquaryIndex: 3,
    rdavMin: 700,
    rdavMax: 1800,
    rolls: 2,
    table: [
      { itemKey: 'runic_pickaxe', weight: 36 },
      { itemKey: 'labyrinth_lantern', weight: 36 },
      { itemKey: null, weight: 28 },
    ],
  },
  zone_4: {
    reliquaryIndex: 4,
    rdavMin: 2200,
    rdavMax: 6400,
    rolls: 3,
    table: [
      { itemKey: 'runic_pickaxe', weight: 32 },
      { itemKey: 'labyrinth_lantern', weight: 32 },
      { itemKey: 'abyssal_elixir', weight: 12 },
      { itemKey: null, weight: 24 },
    ],
  },
}

/** Blood price to drag an incapacitated squad back to their feet */
export const ELIXIR_CURE_COST = 500

/** Whole $RDAV the shrine pours once an hour during the beta. */
export const FAUCET_AMOUNT = 10_000

/** How long the vein stays dry after a draw. */
export const FAUCET_COOLDOWN_MS = 60 * 60 * 1000

/** $RDAV burned to wake one random mercenary at the shrine. */
export const SUMMON_COST = 50

/** Offerings the altar accepts inside one window. */
export const SUMMONS_PER_WINDOW = 3

/** The summon window. After this the count resets. */
export const SUMMON_WINDOW_MS = 60 * 60 * 1000

export const FAUCET_DRY = 'The vein is dry. The shrine refills once an hour.'
export const SUMMON_CAP = 'The altar accepts only three offerings an hour.'
export const SUMMON_BROKE = 'Need 50 $RDAV to wake a blade.'

/** Smuggler's Den cut. The rest is paid to the seller. */
export const GUILD_TAX_RATE = 0.03

/** Seller id used when the wallet is still disconnected */
export const LOCAL_SELLER_ID = 'local-vault'

export const MARKET_WOUNDED = 'The Smugglers refuse wounded goods. Heal them first.'
export const MARKET_GEAR = 'Unequip all gear before consigning to the black market.'
export const MARKET_TAX_WARNING = 'The Guild takes a 3% blood tax on sales.'

/**
 * How long a collapse lasts before the chain clock clears it.
 * Costly wins are shorter than a full defeat.
 */
export const INCAPACITATION_MS = {
  costly: 15 * 60_000,
  defeat: 45 * 60_000,
} as const

/**
 * Base item template in the stash registry (not yet an owned instance).
 * Spawn via createItemFromBase() — instance `id` is assigned at mint time.
 */
export interface BaseItemDef {
  /** Stable registry key for loot tables / Solana item enum */
  key: string
  /** Inventory / equip category */
  type: ItemType
  /** Display name */
  name: string
  /** Rarity tier */
  rarity: Rarity
  /** Stat bonuses while equipped / consumed */
  stats: ItemStats
  /** Max durability for tools; consumables may use 1 */
  durability: number
  /** Optional lore / effect blurb for codex & tooltips */
  description?: string
}

/**
 * Stash base catalog — DevTool and future loot rolls spawn from these rows.
 */
export const BASE_ITEMS: BaseItemDef[] = [
  {
    key: 'iron_pickaxe',
    type: 'pickaxe',
    name: 'Iron Pickaxe',
    rarity: 'Common',
    stats: { mining: 20 },
    durability: 50,
    description: 'A dented vault-issue pick. Enough to chip the Sunken Tunnels.',
  },
  {
    key: 'runic_pickaxe',
    type: 'pickaxe',
    name: 'Runic Pickaxe',
    rarity: 'Rare',
    stats: { mining: 80, luck: 5 },
    durability: 150,
    description: 'Rune-etched head that sings when it strikes living ore.',
  },
  {
    key: 'labyrinth_lantern',
    type: 'accessory',
    name: 'Labyrinth Lantern',
    rarity: 'Uncommon',
    stats: { luck: 15 },
    durability: 80,
    description: 'Cold blue flame that reveals false walls and lucky veins.',
  },
  {
    key: 'dwarven_dynamite',
    type: 'consumable',
    name: 'Dwarven Dynamite',
    rarity: 'Common',
    stats: {},
    durability: 1,
    description: '+30% Ore Yield on next delve',
  },
  {
    key: 'abyssal_elixir',
    type: 'consumable',
    name: 'Abyssal Elixir',
    rarity: 'Epic',
    stats: {},
    durability: 1,
    description: 'Instantly cures Incapacitated status',
  },
]

/** Lookup a base item by stable registry key */
export function getBaseItem(key: string): BaseItemDef | undefined {
  return BASE_ITEMS.find((row) => row.key === key)
}

/**
 * Landing-page vault ticker numbers (dummy Phase 1 placeholders).
 * Swap for live chain / indexer values in a later phase.
 */
export const VAULT_GLOBAL_STATS = {
  abyssalReserves: 50_000_000,
  expeditionsLaunched: 12_450,
  reliquariesUnsealed: 3_421,
} as const

/** Barracks economy: rename a delver */
export const RENAME_COST = 500

/** Barracks economy: Runic Imbuement (level-up) flat $RDAV cost */
export const IMBUE_COST = 1_000

/** Stat points granted to each attribute on imbuement (sanity capped later) */
export const IMBUE_STAT_GAIN = 2

/** Dummy address used by the old mock wallet. Real login uses a Solana public key. */
export const MOCK_WALLET_ADDRESS = '0x7aF3c91Bd4e8a2f1c6E0b9d5A4c3B2a19c2'

/** Cluster the shrine and the program share. Keep this on the same network as the mint. */
export const SOLANA_CLUSTER = 'devnet' as const

/**
 * Prefer a private RPC (Helius) from `.env.local`.
 * Public Devnet RPC often times out while Phantom is open.
 */
export const SOLANA_RPC_URL =
  (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined)?.trim() ||
  'https://api.devnet.solana.com'

/** Deployed program. Playground build on 2026-09-20. */
export const RDAV_PROGRAM_ID = '8cNry1rJa2WMJX9EdvcDPd346mTjoWWTw39HKshCN3eT'

/** The $RDAV mint created in Playground. 9 decimals. */
export const RDAV_MINT_ADDRESS = '8mL2P4G3S3AnJJNaA5VzrDpnMBDBNspQ7U4hHQx1MDrk'

/**
 * CSS / Tailwind-friendly rarity accent colors for glow & badges.
 */
export const RARITY_COLORS: Record<Rarity, string> = {
  Common: '#9CA3AF',
  Uncommon: '#3B82F6',
  Rare: '#6366F1',
  Epic: '#9D4EDD',
  Legendary: '#B8860B',
  Abyssal: '#EF4444',
}

/** Drop-shadow snippets matching rarity for delver avatars */
export const RARITY_DROP_SHADOWS: Record<Rarity, string> = {
  Common: 'drop-shadow(0 0 6px #9CA3AF)',
  Uncommon: 'drop-shadow(0 0 8px #3B82F6)',
  Rare: 'drop-shadow(0 0 10px #6366F1)',
  Epic: 'drop-shadow(0 0 12px #9D4EDD)',
  Legendary: 'drop-shadow(0 0 14px #B8860B)',
  Abyssal: 'drop-shadow(0 0 16px #EF4444)',
}

/** Visual caps used by StatBar fill percentages */
export const STAT_BAR_CAPS: Record<StatKey, number> = {
  mining: 80,
  power: 80,
  armor: 80,
  luck: 80,
  speed: 80,
  sanity: 100,
}

/** Weighted rarity rolls for DevTool / recruitment (N→UR ladder) */
export const RARITY_ROLL_WEIGHTS: { rarity: Rarity; weight: number }[] = [
  { rarity: 'Common', weight: 40 },
  { rarity: 'Uncommon', weight: 28 },
  { rarity: 'Rare', weight: 18 },
  { rarity: 'Epic', weight: 9 },
  { rarity: 'Legendary', weight: 4 },
  { rarity: 'Abyssal', weight: 1 },
]

/** Fantasy name pools for random delver generation */
export const DELVER_NAME_POOL = [
  'Ashen Kael',
  'Mira Voidvein',
  'Gorruk Ironjaw',
  'Syl Vesper',
  'Thane Blackore',
  'Nyx Reliquary',
  'Borin Deeppick',
  'Lira Nightglass',
  'Keth Abyssborn',
  'Ora Runeheart',
] as const
