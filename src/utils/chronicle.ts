/**
 * Chronicle engine — one seeded pass from squad stats vs zone threat.
 * Same expedition id always writes the same log, so a refresh cannot reroll loot.
 */

import {
  DUNGEON_ZONES,
  INCAPACITATION_MS,
  PERSONALITIES,
  RELIQUARIES,
  ZONE_LOOT,
  type ReliquaryName,
} from '../config/gameConfig'
import type { Delver, ExpeditionRun } from '../types/game'
import { effectiveStats } from './squadPower'

export type ChronicleOutcome = 'Success' | 'Costly Win' | 'Defeat'

export interface ChronicleDelta {
  delverId: string
  dungeonsCleared: number
  rdavEarned: number
  oreExtracted: number
  damageTaken: number
  hoursDelved: number
}

export interface ChronicleReport {
  outcome: ChronicleOutcome
  lines: string[]
  reliquary: ReliquaryName
  rdav: number
  itemKeys: string[]
  incapacitatedIds: string[]
  /** How long the collapse lasts. Zero when nobody fell. */
  downForMs: number
  deltas: ChronicleDelta[]
}

/** FNV-ish seed so the log is stable for a given run id */
function hashSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function makeRng(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function pickWeighted<T extends { weight: number }>(rows: T[], roll: number): T {
  const total = rows.reduce((sum, row) => sum + row.weight, 0)
  let ticket = roll * total
  for (const row of rows) {
    ticket -= row.weight
    if (ticket <= 0) return row
  }
  return rows[rows.length - 1]!
}

interface Fighter {
  delver: Delver
  power: number
  mining: number
  armor: number
  luck: number
  injury: number
}

function scoreFighter(delver: Delver): Fighter {
  const stats = effectiveStats(delver)
  const trait = PERSONALITIES[delver.personality]
  let power = stats.power
  let mining = stats.mining
  let injury = 1
  if (trait.name === 'Wrathful') power *= 1.25
  if (trait.name === 'Avaricious') mining *= 1.2
  if (trait.name === 'Vigilant') {
    mining *= 0.9
    injury *= 0.5
  }
  if (trait.name === 'Stoic') injury *= 0.7
  if (trait.name === 'Reckless') injury *= 1.15
  return {
    delver,
    power,
    mining,
    armor: stats.armor,
    luck: stats.luck,
    injury,
  }
}

function flavor(delver: Delver, hurt: boolean): string {
  const trait = PERSONALITIES[delver.personality].name
  const who = `${delver.name} the ${trait}`
  if (trait === 'Avaricious') return `${who} ${delver.jobClass} found extra shards in the spoil.`
  if (trait === 'Vigilant') return `${who} marked the snare before it closed.`
  if (trait === 'Wrathful') return `${who} broke the warden's line.`
  if (trait === 'Stoic') return `${who} walked the hazard and did not kneel.`
  if (hurt) return `${who} sprinted ahead and paid in blood.`
  return `${who} cut the dark shorter than the map allowed.`
}

/** Build the full log, chest, and stat deltas for a finished run */
export function buildChronicle(run: ExpeditionRun, squad: Delver[]): ChronicleReport {
  const zone = DUNGEON_ZONES.find((entry) => entry.id === run.zoneId) ?? DUNGEON_ZONES[0]!
  const table = ZONE_LOOT[zone.id] ?? ZONE_LOOT.zone_1!
  const rng = makeRng(hashSeed(run.id))
  const fighters = squad.map(scoreFighter)
  const combat = fighters.reduce((sum, row) => sum + row.power, 0)
  const mining = fighters.reduce((sum, row) => sum + row.mining, 0)
  const threat = zone.requiredPower <= 0 ? 8 : zone.requiredPower
  const ratio = combat / threat
  const injuryBias = fighters.reduce((sum, row) => sum + row.injury, 0) / Math.max(1, fighters.length)
  const injuryRoll = rng() * injuryBias
  const hurt = injuryRoll > Math.max(0.18, 0.72 - ratio * 0.35)

  let outcome: ChronicleOutcome = 'Success'
  if (ratio < 0.72 || (hurt && ratio < 0.9)) outcome = 'Defeat'
  else if (hurt || ratio < 1.05) outcome = 'Costly Win'

  const down = new Set<string>()
  if (outcome === 'Defeat') {
    for (const row of fighters) down.add(row.delver.id)
  } else if (outcome === 'Costly Win' && fighters.length > 0) {
    const ranked = [...fighters].sort(
      (a, b) => a.armor + a.delver.stats.sanity - (b.armor + b.delver.stats.sanity),
    )
    const victim = ranked.find((row) => PERSONALITIES[row.delver.personality].name !== 'Vigilant' || rng() > 0.5)
    if (victim) down.add(victim.delver.id)
  }

  const yieldMod = fighters.some((row) => PERSONALITIES[row.delver.personality].name === 'Avaricious')
    ? 1.2
    : fighters.some((row) => PERSONALITIES[row.delver.personality].name === 'Vigilant')
      ? 0.9
      : 1
  const outcomeMod = outcome === 'Defeat' ? 0.35 : outcome === 'Costly Win' ? 0.75 : 1
  const span = table.rdavMax - table.rdavMin
  const rdav = Math.max(1, Math.round((table.rdavMin + rng() * span) * yieldMod * outcomeMod))

  const rollCount = outcome === 'Defeat' ? 1 : outcome === 'Costly Win' ? table.rolls : table.rolls + 1
  const itemKeys: string[] = []
  for (let i = 0; i < rollCount; i += 1) {
    const pulled = pickWeighted(table.table, rng())
    if (pulled.itemKey) itemKeys.push(pulled.itemKey)
  }

  const reliquary = RELIQUARIES[table.reliquaryIndex] ?? RELIQUARIES[0]

  const lines = [
    `The cart breached ${zone.name}.`,
    `Combat ${Math.round(combat)} met a ${zone.dangerLevel} threshold of ${zone.requiredPower}.`,
    ...fighters.map((row) => flavor(row.delver, down.has(row.delver.id))),
    outcome === 'Success'
      ? 'The gate held. The squad walks out under their own power.'
      : outcome === 'Costly Win'
        ? 'The gate held. Not everyone did.'
        : 'The dark took them. The cart returns lighter than it left.',
  ]

  const share = Math.floor(rdav / Math.max(1, fighters.length))
  const oreEach = Math.round((mining * outcomeMod * yieldMod) / Math.max(1, fighters.length))
  const hours = run.durationMs / 3_600_000
  const cleared = outcome === 'Defeat' ? 0 : 1

  const deltas: ChronicleDelta[] = fighters.map((row) => {
    const trait = PERSONALITIES[row.delver.personality].name
    let damage = outcome === 'Defeat' ? 48 : outcome === 'Costly Win' ? 18 : 2
    if (trait === 'Vigilant') damage = Math.round(damage * 0.5)
    if (trait === 'Stoic') damage = Math.round(damage * 0.7)
    if (trait === 'Reckless') damage = Math.round(damage * 1.15)
    return {
      delverId: row.delver.id,
      dungeonsCleared: cleared,
      rdavEarned: share,
      oreExtracted: oreEach,
      damageTaken: damage,
      hoursDelved: Math.round(hours * 100) / 100,
    }
  })

  return {
    outcome,
    lines,
    reliquary,
    rdav,
    itemKeys,
    incapacitatedIds: [...down],
    downForMs: down.size === 0 ? 0 : outcome === 'Defeat' ? INCAPACITATION_MS.defeat : INCAPACITATION_MS.costly,
    deltas,
  }
}
