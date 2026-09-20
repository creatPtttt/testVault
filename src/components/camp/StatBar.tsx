/**
 * StatBar — thick dark track with glowing colored fill for delver attributes.
 */

import { STAT_BAR_CAPS } from '../../config/gameConfig'
import type { DelverStats } from '../../types/game'

/** Supported stat keys on a Delver */
export type StatBarKey = keyof DelverStats

/** Muted vault metals — no neon, so bars sit inside the gold shell */
const STAT_COLORS: Record<StatBarKey, string> = {
  mining: '#8f9a78',
  power: '#a34538',
  armor: '#8a8378',
  luck: '#c9a227',
  speed: '#6d8a68',
  sanity: '#8a6e78',
}

/** Human labels for the six meters */
const STAT_LABELS: Record<StatBarKey, string> = {
  mining: 'Mining',
  power: 'Power',
  armor: 'Armor',
  luck: 'Luck',
  speed: 'Speed',
  sanity: 'Sanity',
}

/** Props for a single attribute meter */
export interface StatBarProps {
  stat: StatBarKey
  value: number
}

/**
 * Dark recessed track (h-4) with a solid bright fill + glow.
 */
export function StatBar({ stat, value }: StatBarProps) {
  const cap = STAT_BAR_CAPS[stat]
  const pct = Math.max(0, Math.min(100, (value / cap) * 100))
  const color = STAT_COLORS[stat]

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label = Inter · Value = Silkscreen (numbers only) */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-xs font-medium uppercase tracking-wide text-white/75">
          {STAT_LABELS[stat]}
        </span>
        <span className="font-pixel text-sm" style={{ color }}>
          {value}
        </span>
      </div>

      {/* Thicker track for AAA RPG readability */}
      <div
        className="stat-bar-track h-4 w-full border border-antique-gold/50 bg-obsidian"
        role="meter"
        aria-label={STAT_LABELS[stat]}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={cap}
      >
        <div
          className="stat-bar-fill h-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(180deg, ${color} 0%, ${color}aa 100%)`,
          }}
        />
      </div>
    </div>
  )
}

export default StatBar
