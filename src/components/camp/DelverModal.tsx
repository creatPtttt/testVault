/**
 * DelverModal — Obsidian Dossier with live equip / unequip from The Stash.
 */

import { useEffect, useState } from 'react'
import { Axe, Gem, Package, Shield } from 'lucide-react'
import {
  IMBUE_COST,
  PERSONALITIES,
  RARITY_COLORS,
  RENAME_COST,
} from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import type { Delver, Item } from '../../types/game'
import { ItemSlot } from '../ui/ItemSlot'
import { RenameModal } from '../ui/RenameModal'
import { RuneButton } from '../ui/RuneButton'
import { ToastBanner } from '../ui/ToastBanner'
import { ItemGlyph } from '../ui/ItemGlyph'
import { JOB_PORTRAIT } from './campSprites'
import { isAbyssalElixir } from '../../utils/itemArt'
import { collapseRemaining, formatRemaining, isDelverIdle, isInjured } from '../../utils/squadPower'
import { StatBar, type StatBarKey } from './StatBar'

const STAT_ORDER: StatBarKey[] = [
  'mining',
  'power',
  'armor',
  'luck',
  'speed',
  'sanity',
]

const EQUIP_SLOTS: Array<{
  key: keyof Delver['slots']
  label: string
  EmptyIcon: typeof Axe
}> = [
  { key: 'pickaxe', label: 'Main-hand', EmptyIcon: Axe },
  { key: 'armor', label: 'Armor', EmptyIcon: Shield },
  { key: 'accessory', label: 'Accessory', EmptyIcon: Gem },
  { key: 'consumable', label: 'Consumable', EmptyIcon: Package },
]

export interface DelverModalProps {
  delver: Delver
  onClose: () => void
  /** Open the physical Stash overlay to pick gear for this delver */
  onOpenStash?: () => void
}

function EquippedIcon({ item }: { item: Item }) {
  return <ItemGlyph item={item} />
}

function EquipmentCell({
  label,
  EmptyIcon,
  equipped,
  onUnequip,
}: {
  label: string
  EmptyIcon: typeof Axe
  equipped: Item | null
  onUnequip: () => void
}) {
  return (
    <div className="relative flex flex-col items-center gap-1.5">
      <ItemSlot
        label={equipped ? `${equipped.name} — click to unequip` : `${label} — empty`}
        empty={!equipped}
        className="equip-well"
        onClick={() => {
          if (equipped) onUnequip()
        }}
      >
        {equipped ? (
          <EquippedIcon item={equipped} />
        ) : (
          <EmptyIcon className="h-6 w-6 text-white/25" strokeWidth={1.25} aria-hidden />
        )}
      </ItemSlot>
      <span className="font-body text-[11px] text-white/55">{label}</span>
      {equipped && (
        <span className="font-body text-[10px] text-antique-gold/70">{equipped.name}</span>
      )}
    </div>
  )
}

export function DelverModal({ delver, onClose, onOpenStash }: DelverModalProps) {
  const { player, renameDelver, imbueDelver, unequipItem, useElixir, sigilBusy } = useGame()
  const [now, setNow] = useState(() => Date.now())
  const live = player.delvers.find((d) => d.id === delver.id) ?? delver
  const locked = !isDelverIdle(live, now)
  const remaining = collapseRemaining(live, now)
  const elixirCount = player.inventory.filter((item) => isAbyssalElixir(item)).length
  const wounded = isInjured(live, now)
  const lockLabel = wounded
    ? `Incapacitated · ${formatRemaining(remaining)}`
    : 'On Expedition'
  const trait = PERSONALITIES[live.personality]
  const rarityColor = RARITY_COLORS[live.rarity]
  const portrait = JOB_PORTRAIT[live.jobClass]

  const [showRename, setShowRename] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showRename) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, showRename])

  useEffect(() => {
    if (!wounded) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [wounded])

  const handleImbue = () => {
    if (locked || sigilBusy) {
      if (locked) setToast('This mercenary is away. The forge will not take them.')
      return
    }
    void imbueDelver(live.id).then((ok) => {
      if (!ok) {
        setToast(
          `Imbuement failed. Need ${IMBUE_COST.toLocaleString('en-US')} $RDAV in the treasury.`,
        )
      } else {
        setToast('Runic Imbuement successful — stats forged higher.')
      }
    })
  }

  return (
    <>
      {toast && (
        <ToastBanner
          message={toast}
          tone={toast.includes('failed') ? 'error' : 'success'}
          onClose={() => setToast(null)}
        />
      )}

      <div
        className="modal-backdrop-in fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delver-modal-title"
        onClick={onClose}
      >
        <div
          className="dossier-shell fade-rise-in relative w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="vault-modal-shell">
            <button
              type="button"
              onClick={onClose}
              className="vault-modal-close"
              aria-label="Close Obsidian Dossier"
            />

            <div className="vault-modal-body dossier-body">
              <header className="dossier-top vault-inset">
                <div className="dossier-portrait-frame" aria-hidden>
                  <img
                    src={`${portrait}?v=5`}
                    alt=""
                    className="dossier-portrait-gif pixelated"
                    draggable={false}
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h2
                    id="delver-modal-title"
                    className="font-heading text-3xl text-antique-gold drop-shadow-[0_0_12px_rgba(184,134,11,0.55)] md:text-4xl"
                  >
                    {live.name}
                  </h2>
                  <p className="font-body text-sm text-white/70">{live.jobClass}</p>
                  <span
                    className="w-fit font-body text-xs font-semibold uppercase tracking-widest"
                    style={{ color: rarityColor, textShadow: `0 0 8px ${rarityColor}` }}
                  >
                    {live.rarity}
                  </span>
                  {locked && (
                    <p className="font-body text-sm text-[#e07070]">{lockLabel}</p>
                  )}
                  {wounded && (
                    <div className="pt-1">
                      <RuneButton
                        type="button"
                        glow="amethyst"
                        className="rune-pulse"
                        disabled={elixirCount === 0}
                        onClick={() => {
                          void useElixir(live.id).then((ok) => {
                            setToast(
                              ok
                                ? 'The elixir takes. They stand.'
                                : 'No Abyssal Elixir in the stash.',
                            )
                          })
                        }}
                      >
                        Administer Abyssal Elixir (Cures Instantly)
                      </RuneButton>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <RuneButton
                      type="button"
                      glow="amethyst"
                      disabled={locked}
                      onClick={() => {
                        if (locked) return
                        setShowRename(true)
                      }}
                    >
                      Rename (
                      <span className="font-pixel mx-1">
                        {RENAME_COST.toLocaleString('en-US')}
                      </span>
                      $RDAV)
                    </RuneButton>
                    {onOpenStash && (
                      <RuneButton
                        type="button"
                        glow="runeflame"
                        disabled={locked}
                        onClick={() => {
                          if (locked) return
                          onOpenStash()
                        }}
                      >
                        Equip from Stash
                      </RuneButton>
                    )}
                  </div>
                </div>
              </header>

              <section className="vault-inset">
                <h3 className="vault-section-title font-body">Personality</h3>
                <p className="font-body text-sm leading-relaxed text-white/85">
                  <span className="font-semibold text-antique-gold">[{trait.name}]</span>
                  {' — '}
                  {trait.desc}
                </p>
              </section>

              <section className="vault-inset">
                <h3 className="vault-section-title font-body">Attributes</h3>
                <div className="grid grid-cols-1 gap-3">
                  {STAT_ORDER.map((stat) => (
                    <StatBar key={stat} stat={stat} value={live.stats[stat]} />
                  ))}
                </div>
              </section>

              <section className="vault-inset dossier-span">
                <h3 className="vault-section-title font-body">Equipment</h3>
                <p className="mb-4 font-body text-[11px] text-white/50">
                  {locked
                    ? 'Gear is sealed while this mercenary is away.'
                    : 'Click an equipped slot to unequip · Use Equip from Stash to arm gear'}
                </p>
                <div className="grid grid-cols-4 gap-4 sm:max-w-xl">
                  {EQUIP_SLOTS.map(({ key, label, EmptyIcon }) => (
                    <EquipmentCell
                      key={key}
                      label={label}
                      EmptyIcon={EmptyIcon}
                      equipped={live.slots[key]}
                      onUnequip={() => {
                        if (locked) {
                          setToast('Cannot change equipment while On Expedition.')
                          return
                        }
                        const name = live.slots[key]?.name
                        void unequipItem(live.id, key).then((ok) => {
                          setToast(
                            ok ? `${name ?? 'Item'} returned to The Stash.` : 'Nothing to unequip.',
                          )
                        })
                      }}
                    />
                  ))}
                </div>
              </section>

              <section className="vault-inset dossier-span">
                <h3 className="vault-section-title font-body">Lifetime Stats</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ['Expeditions', live.lifetimeStats.dungeonsCleared],
                      ['Ore Extracted', live.lifetimeStats.oreExtracted],
                      ['$RDAV Earned', live.lifetimeStats.rdavEarned],
                      ['Hours Delved', live.lifetimeStats.hoursDelved],
                      ['Damage Taken', live.lifetimeStats.damageTaken],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="border border-antique-gold/25 bg-black/40 px-3 py-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]"
                    >
                      <p className="font-body text-[11px] text-white/50">{label}</p>
                      <p className="mt-1 font-pixel text-base text-antique-gold">
                        {value.toLocaleString('en-US')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <footer className="vault-inset dossier-span flex flex-wrap items-center justify-between gap-3">
                <p className="font-body text-sm text-white/55">
                  Balance:{' '}
                  <span className="font-pixel text-runeflame">
                    {player.rdavBalance.toLocaleString('en-US')}
                  </span>{' '}
                  $RDAV
                </p>
                <RuneButton
                  type="button"
                  glow="runeflame"
                  className="rune-pulse"
                  disabled={locked}
                  onClick={handleImbue}
                >
                  Runic Imbuement —{' '}
                  <span className="font-pixel mx-1">{IMBUE_COST.toLocaleString('en-US')}</span> $RDAV
                </RuneButton>
              </footer>
            </div>
          </div>
        </div>
      </div>

      {showRename && (
        <RenameModal
          currentName={live.name}
          rdavBalance={player.rdavBalance}
          onConfirm={async (newName) => {
            const ok = await renameDelver(live.id, newName)
            if (ok) setToast(`The muster book now reads ${newName}.`)
            return ok
          }}
          onClose={() => setShowRename(false)}
        />
      )}
    </>
  )
}

export default DelverModal
