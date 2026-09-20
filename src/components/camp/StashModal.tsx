/**
 * StashModal — vault bag. Hover opens a floating relic plaque (not an in-page lore well).
 * The plaque uses pointer-events: none and sits beside the slot so it cannot flicker.
 */

import { useState } from 'react'
import { RARITY_COLORS } from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import type { Item, ItemStats } from '../../types/game'
import { isDelverIdle } from '../../utils/squadPower'
import { ItemGlyph } from '../ui/ItemGlyph'

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

/** Place the plaque above the slot so it never covers the hovered relic */
function placePlaque(rect: DOMRect): { top: number; left: number } {
  const width = 264
  const height = 200
  const gap = 12
  let left = rect.left + rect.width / 2 - width / 2
  left = Math.min(Math.max(8, left), window.innerWidth - width - 8)
  let top = rect.top - height - gap
  if (top < 8) top = rect.bottom + gap
  if (top + height > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - height - 8)
  }
  return { top, left }
}

export interface StashModalProps {
  onClose: () => void
  equipTargetId?: string | null
  onEquipped?: () => void
}

export function StashModal({ onClose, equipTargetId, onEquipped }: StashModalProps) {
  const { player, equipItem, sigilBusy } = useGame()
  const [equipNote, setEquipNote] = useState<string | null>(null)
  const [hovered, setHovered] = useState<Item | null>(null)
  const [plaque, setPlaque] = useState<{ top: number; left: number } | null>(null)
  const canEquip = Boolean(equipTargetId)
  const target = player.delvers.find((delver) => delver.id === equipTargetId)
  const targetIdle = target ? isDelverIdle(target) : false

  const showPlaque = (item: Item, el: HTMLElement) => {
    setHovered(item)
    setPlaque(placePlaque(el.getBoundingClientRect()))
  }

  const hidePlaque = () => {
    setHovered(null)
    setPlaque(null)
  }

  return (
    <div
      className="modal-backdrop-in fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stash-modal-title"
      onClick={onClose}
    >
      <div className="stash-modal fade-rise-in relative" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-shell">
          <button
            type="button"
            onClick={onClose}
            className="vault-modal-close"
            aria-label="Close The Stash"
          />

          <header className="vault-modal-header">
            <div className="vault-title-block">
              <h2 id="stash-modal-title" className="vault-modal-title font-heading">
                The Stash
              </h2>
              <p className="vault-modal-sub font-body">
                Reliquary stores · Hover a relic · Click to equip
              </p>
            </div>
            <p className="vault-modal-count font-body">
              <span className="font-pixel text-runeflame">{player.inventory.length}</span>
              <span className="ml-1 text-[10px] uppercase tracking-wider text-white/40">items</span>
            </p>
          </header>

          <div className="vault-modal-body">
            {canEquip && !targetIdle && (
              <p className="vault-inset mb-3 font-body text-xs text-[#e07070]">
                On Expedition — gear cannot be changed.
              </p>
            )}
            {canEquip && targetIdle && (
              <p className="vault-inset mb-3 font-body text-xs text-antique-gold/85">
                Click a gear item to arm the open dossier.
              </p>
            )}
            {equipNote && (
              <p className="vault-inset mb-3 font-body text-xs text-runeflame">{equipNote}</p>
            )}

            <div className="vault-inset stash-grid-well">
              {player.inventory.length === 0 ? (
                <p className="py-8 text-center font-body text-sm text-white/65">
                  The vault is bare. Unseal a chest in the Depths, or buy from the Bazaar.
                </p>
              ) : (
                <div className="stash-grid">
                  {player.inventory.map((item) => {
                    const equippable = canEquip && targetIdle && item.type !== 'material'
                    const isHot = hovered?.id === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`stash-slot ${isHot ? 'is-hot' : ''}`}
                        aria-label={item.name}
                        onMouseEnter={(e) => showPlaque(item, e.currentTarget)}
                        onMouseLeave={hidePlaque}
                        onFocus={(e) => showPlaque(item, e.currentTarget)}
                        onBlur={hidePlaque}
                        onClick={() => {
                          if (!equipTargetId || !equippable || sigilBusy) return
                          void equipItem(equipTargetId, item.id).then((ok) => {
                            if (ok) {
                              setEquipNote(`${item.name} is strapped.`)
                              onEquipped?.()
                            } else {
                              setEquipNote('The seal refused that strap.')
                            }
                          })
                        }}
                      >
                        <ItemGlyph item={item} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {hovered && plaque && (
        <div
          className="stash-float"
          role="tooltip"
          style={{ top: plaque.top, left: plaque.left }}
        >
          <p className="font-heading text-xl" style={{ color: RARITY_COLORS[hovered.rarity] }}>
            {hovered.name}
          </p>
          <p className="mt-1 font-body text-xs uppercase tracking-wide text-white/55">
            {hovered.rarity} · {hovered.type}
          </p>
          <p className="mt-3 font-body text-sm text-white/75">
            Durability:{' '}
            <span className="font-pixel text-antique-gold">{hovered.durability}</span>
          </p>
          <ul className="mt-2 space-y-1">
            {formatStatLines(hovered.stats).map((line) => (
              <li key={line} className="font-body text-sm text-[#d8b56a]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default StashModal
