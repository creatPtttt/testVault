/**
 * StashView — Diablo-style inventory grid with dark tooltips (Phase 2.5 fonts).
 */

import { useState } from 'react'
import { RARITY_COLORS } from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import type { Item, ItemStats } from '../../types/game'
import { ItemSlot } from '../ui/ItemSlot'
import { StonePanel } from '../ui/StonePanel'
import { ITEM_TYPE_ICONS } from './campIcons'

function formatStatLines(stats: ItemStats): string[] {
  const order: Array<keyof ItemStats> = [
    'mining',
    'power',
    'armor',
    'luck',
    'speed',
    'sanity',
  ]
  const lines: string[] = []
  for (const key of order) {
    const val = stats[key]
    if (typeof val === 'number' && val !== 0) {
      const label = key.charAt(0).toUpperCase() + key.slice(1)
      const sign = val > 0 ? '+' : ''
      lines.push(`${label} ${sign}${val}`)
    }
  }
  return lines
}

export function StashView() {
  const { player } = useGame()
  const [hovered, setHovered] = useState<Item | null>(null)

  if (player.inventory.length === 0) {
    return (
      <StonePanel className="mx-auto max-w-xl p-8 text-center">
        <h3 className="font-heading text-2xl text-antique-gold">The Stash is Empty</h3>
        <p className="mt-3 font-body text-sm text-white/70">
          Unseal a chest in the Depths, or buy a relic from the Bazaar.
        </p>
      </StonePanel>
    )
  }

  const statLines = hovered ? formatStatLines(hovered.stats) : []

  return (
    <StonePanel className="relative border-[3px] border-antique-gold p-6 shadow-[0_0_28px_rgba(184,134,11,0.2),inset_0_0_24px_rgba(0,0,0,0.55)] md:p-8">
      <div className="mb-5 flex items-center justify-between border-b border-antique-gold/30 pb-4">
        <h3 className="font-heading text-2xl text-antique-gold drop-shadow-[0_0_8px_rgba(184,134,11,0.4)]">
          The Stash
        </h3>
        <span className="font-body text-sm text-white/60">
          <span className="font-pixel text-runeflame">{player.inventory.length}</span> items
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {player.inventory.map((item) => {
          const Icon = ITEM_TYPE_ICONS[item.type]
          const color = RARITY_COLORS[item.rarity]
          return (
            <ItemSlot
              key={item.id}
              label={item.name}
              className="relative hover:shadow-[0_0_12px_rgba(184,134,11,0.45)]"
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(item)}
              onBlur={() => setHovered(null)}
            >
              <Icon
                className="h-7 w-7"
                strokeWidth={1.5}
                style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}
                aria-hidden
              />
            </ItemSlot>
          )
        })}
      </div>

      {hovered && (
        <div
          className="tooltip-fade pointer-events-none absolute left-1/2 top-20 z-10 w-60 -translate-x-1/2 border-2 border-antique-gold bg-obsidian/95 p-4 shadow-[0_0_20px_rgba(0,240,255,0.25),0_8px_24px_rgba(0,0,0,0.85)]"
          role="tooltip"
        >
          <p className="font-heading text-lg" style={{ color: RARITY_COLORS[hovered.rarity] }}>
            {hovered.name}
          </p>
          <p className="mt-1 font-body text-xs uppercase tracking-wide text-white/50">
            {hovered.rarity} · {hovered.type}
          </p>
          <p className="mt-3 font-body text-sm text-white/70">
            Durability:{' '}
            <span className="font-pixel text-antique-gold">{hovered.durability}</span>
          </p>
          <ul className="mt-2 space-y-1">
            {statLines.map((line) => (
              <li key={line} className="font-body text-sm text-runeflame">
                {line}
              </li>
            ))}
            {statLines.length === 0 && (
              <li className="font-body text-sm text-white/40">No stat mods</li>
            )}
          </ul>
        </div>
      )}
    </StonePanel>
  )
}

export default StashView
