/**
 * Squad math for the summoning altar.
 * Totals always include equipped gear from Phase 2 slots.
 */

import type { Delver, DelverStats, DelverStatus, ExpeditionRun } from '../types/game'

const STAT_KEYS: (keyof DelverStats)[] = [
  'mining',
  'power',
  'armor',
  'luck',
  'speed',
  'sanity',
]

/** Older saves omit status — treat them as waiting at the fire */
export function delverStatus(delver: Delver): DelverStatus {
  return delver.status ?? 'idle'
}

/** Milliseconds left on a collapse. Zero when they can stand. */
export function isInjured(delver: Delver, now = Date.now()): boolean {
  return delver.incapacitatedUntil != null && delver.incapacitatedUntil > now
}

export function collapseRemaining(delver: Delver, now = Date.now()): number {
  if (!isInjured(delver, now) || delver.incapacitatedUntil == null) return 0
  return delver.incapacitatedUntil - now
}

/** True when barracks may rename, imbue, change gear, or dispatch */
export function isDelverIdle(delver: Delver, now = Date.now()): boolean {
  if (delverStatus(delver) === 'delving') return false
  if (isInjured(delver, now)) return false
  return true
}

/** Naked mercenaries only. A filled slot blocks the black market. */
export function hasEquippedGear(delver: Delver): boolean {
  return Object.values(delver.slots).some((slot) => slot != null)
}

/** `14m 05s` for the barracks plaque */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

/** Base stats plus every equipped item's modifiers */
export function effectiveStats(delver: Delver): DelverStats {
  const totals: DelverStats = { ...delver.stats }
  for (const item of Object.values(delver.slots)) {
    if (!item) continue
    for (const key of STAT_KEYS) {
      totals[key] += item.stats[key] ?? 0
    }
  }
  return totals
}

/** Live altar readout: summed mining, summed combat power, mean luck */
export function squadSummary(delvers: Delver[]): {
  mining: number
  power: number
  luck: number
} {
  if (delvers.length === 0) return { mining: 0, power: 0, luck: 0 }
  const rows = delvers.map(effectiveStats)
  const mining = rows.reduce((sum, row) => sum + row.mining, 0)
  const power = rows.reduce((sum, row) => sum + row.power, 0)
  const luck = Math.round(rows.reduce((sum, row) => sum + row.luck, 0) / rows.length)
  return { mining, power, luck }
}

/** 0–1 progress from wall-clock time so a closed tab still advances */
export function expeditionProgress(run: ExpeditionRun, now = Date.now()): number {
  if (run.durationMs <= 0) return 1
  const elapsed = now - run.startedAt
  return Math.min(1, Math.max(0, elapsed / run.durationMs))
}

/** Minutes as a short label (5m / 2h / 8h) */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}
