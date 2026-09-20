/**
 * RuneDelve: Abyssal Vault — Core game type definitions
 * Phase 0: data foundation only (no UI screens).
 */

/** Item / delver rarity ladder from weakest to mythic */
export type Rarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Abyssal'

/** Playable mercenary job classes available in the vaults */
export type JobClass =
  | 'Rune Arcanist'
  | 'Breaker Paladin'
  | 'Ashen Rogue'
  | 'Vault Geomancer'
  | 'Sanity Warden'

/** Equipment / inventory item categories */
export type ItemType = 'pickaxe' | 'armor' | 'accessory' | 'consumable' | 'material'

/**
 * Core combat / delve attributes shared by delvers and gear modifiers.
 * Sanity is always clamped conceptually to the 0–100 range.
 */
export interface DelverStats {
  /** Yield / extraction efficiency while mining rune veins */
  mining: number
  /** Raw combat strength for clearing dungeon encounters */
  power: number
  /** Damage mitigation while exploring */
  armor: number
  /** Chance for rare drops and critical finds */
  luck: number
  /** How quickly delve timers resolve */
  speed: number
  /** Mental stability (0–100); low values risk breakdown events */
  sanity: number
}

/** Optional stat modifiers applied by items (partial of DelverStats) */
export type ItemStats = Partial<DelverStats>

/** Where a mercenary is right now. Injury is NOT a status — it is `incapacitatedUntil`. */
export type DelverStatus = 'idle' | 'delving'

/** One dispatched run. Progress is derived from startedAt + durationMs (offline-safe). */
export interface ExpeditionRun {
  /** Unique run id */
  id: string
  /** DUNGEON_ZONES id, e.g. zone_1 */
  zoneId: string
  /** Mercenaries sealed into this run (1–3) */
  delverIds: string[]
  /** Epoch ms when the cart left the altar */
  startedAt: number
  /** Full trip length in milliseconds */
  durationMs: number
  /** Epoch ms when the player unsealed the reliquary; null while the cart is out */
  unsealedAt: number | null
}

/** Lifetime counters tracked on each mercenary delver */
export interface LifetimeStats {
  /** Total successful dungeon runs completed */
  dungeonsCleared: number
  /** Cumulative $RDAV earned by this delver */
  rdavEarned: number
  /** Total mining yield units extracted */
  oreExtracted: number
  /** Total damage taken across all runs */
  damageTaken: number
  /** Total hours (approx) spent in active delves */
  hoursDelved: number
}

/** Gear slots a delver can equip — null means empty */
export interface DelverSlots {
  /** Primary mining / combat tool */
  pickaxe: Item | null
  /** Protective body gear */
  armor: Item | null
  /** Trinket providing secondary bonuses */
  accessory: Item | null
  /** Single-use item prepared for the next delve */
  consumable: Item | null
}

/**
 * Delver (Mercenary) — a hireable adventurer that runs idle delves.
 */
export interface Delver {
  /** Unique identifier for this mercenary instance */
  id: string
  /** Display name shown in the roster */
  name: string
  /** Rarity tier affecting base stat multipliers */
  rarity: Rarity
  /** Job class determining base stat spread */
  jobClass: JobClass
  /** Live combat / mining attributes */
  stats: DelverStats
  /** Personality archetype index (0–4) used by dialogue / idle events */
  personality: 0 | 1 | 2 | 3 | 4
  /** Currently equipped gear */
  slots: DelverSlots
  /** Career totals that never reset on level-up */
  lifetimeStats: LifetimeStats
  /** idle at the fire, or delving in a zone. A collapse is only `incapacitatedUntil`. */
  status: DelverStatus
  /**
   * Epoch ms when a collapse ends. Null when healthy.
   * Past this instant the mercenary is idle again — no extra transaction.
   */
  incapacitatedUntil: number | null
}

/**
 * Item — pickaxes, consumables, materials, and other inventory objects.
 */
export interface Item {
  /** Unique identifier for this item instance */
  id: string
  /** Category used by inventory filters and equip rules */
  type: ItemType
  /** Display name */
  name: string
  /** Rarity tier of this item */
  rarity: Rarity
  /** Stat bonuses granted while equipped / consumed */
  stats: ItemStats
  /** Remaining durability; materials may use 0 or omit wear */
  durability: number
}

/**
 * PlayerState — the root mutable save payload for the local player.
 * Note: schemaVersion lives on the persistence wrapper, not here.
 */
export interface PlayerState {
  /** Current $RDAV token balance held by the player */
  rdavBalance: number
  /** Owned mercenary roster */
  delvers: Delver[]
  /** Bag of unequipped / stackable items */
  inventory: Item[]
  /** ISO timestamp of the last successful login / session hydrate */
  lastLogin: string
  /** Mock / real wallet address; null when disconnected ("try before you buy") */
  walletAddress: string | null
  /** Epoch ms of the last shrine faucet draw. 0 means never. */
  lastFaucetAt: number
  /** Epoch ms when the current three-summon hour started. 0 means unused. */
  summonWindowStart: number
  /** Summons already taken inside the current hour. */
  summonsInWindow: number
  /** Runs currently on the rusty track, plus claimed history */
  expeditions: ExpeditionRun[]
  /** Mock global order book. Later this row is a program account. */
  marketListings: MarketListing[]
}

/** One consignment on the mock black market. The asset leaves the owner until sale or cancel. */
export interface MarketListing {
  id: string
  /** Wallet, `local-vault`, or an NPC fence id */
  sellerId: string
  sellerName: string
  /** Asking price in $RDAV only */
  price: number
  listedAt: number
  asset:
    | { kind: 'delver'; delver: Delver }
    | { kind: 'item'; item: Item }
}
export interface GameSaveData {
  /** Save schema version — bump when PlayerState shape changes */
  schemaVersion: number
  /** Nested player snapshot */
  player: PlayerState
}
