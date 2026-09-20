/**
 * ChronicleModal — the run's whole log, then the chest, then the blood price.
 * After a chain claim the expedition leaves the live list, so this modal
 * keeps its own copy of the report until the player dismisses it.
 */

import { useEffect, useMemo, useState } from 'react'
import { ELIXIR_CURE_COST, RARITY_COLORS, getBaseItem } from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import { buildChronicle, type ChronicleReport } from '../../utils/chronicle'
import { itemSpriteByKey } from '../../utils/itemArt'
import { formatRemaining } from '../../utils/squadPower'
import { RuneButton } from '../ui/RuneButton'
import type { ExpeditionRun } from '../../types/game'

export interface ChronicleModalProps {
  expeditionId: string
  onClose: () => void
}

export function ChronicleModal({ expeditionId, onClose }: ChronicleModalProps) {
  const { player, claimExpedition, cureDelvers, sigilBusy } = useGame()
  const liveRun = player.expeditions.find((entry) => entry.id === expeditionId)

  const liveSquad = useMemo(() => {
    if (!liveRun) return []
    return liveRun.delverIds
      .map((id) => player.delvers.find((delver) => delver.id === id))
      .filter((delver): delver is NonNullable<typeof delver> => Boolean(delver))
  }, [player.delvers, liveRun])

  const livePreview = useMemo(
    () => (liveRun && liveSquad.length > 0 ? buildChronicle(liveRun, liveSquad) : null),
    [liveRun, liveSquad],
  )

  // Freeze the run when the modal opens so a successful claim cannot unmount it.
  const [heldRun, setHeldRun] = useState<ExpeditionRun | null>(null)
  const [heldPreview, setHeldPreview] = useState<ChronicleReport | null>(null)
  const [phase, setPhase] = useState<'sealed' | 'shaking' | 'open'>('sealed')
  const [flash, setFlash] = useState(false)
  const [granted, setGranted] = useState<ChronicleReport | null>(null)
  const [cured, setCured] = useState(false)
  const [broke, setBroke] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  useEffect(() => {
    if (heldRun || !liveRun || !livePreview) return
    setHeldRun(liveRun)
    setHeldPreview(livePreview)
  }, [heldRun, liveRun, livePreview])

  const run = heldRun
  const preview = heldPreview
  if (!run || !preview) return null

  const report = granted ?? preview
  const collapsed = report.incapacitatedIds.length > 0 && !cured

  const unseal = () => {
    if (phase !== 'sealed' || sigilBusy) return
    setClaimError(null)
    setPhase('shaking')
    window.setTimeout(() => {
      void Promise.resolve(claimExpedition(expeditionId)).then((next) => {
        if (!next) {
          setPhase('sealed')
          setClaimError('The seal was refused. Confirm in your wallet, then strike again.')
          return
        }
        setGranted(next)
        setFlash(true)
        setPhase('open')
        window.setTimeout(() => setFlash(false), 480)
      })
    }, 680)
  }

  const pay = () => {
    if (sigilBusy) return
    void (async () => {
      const next = granted ?? (await claimExpedition(expeditionId))
      if (!next) return
      setGranted(next)
      setPhase('open')
      const ok = await cureDelvers(next.incapacitatedIds)
      if (ok) setCured(true)
      else setBroke(true)
    })()
  }

  return (
    <div
      className="modal-backdrop-in fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chronicle-title"
    >
      {flash && <div className="reliquary-flash" aria-hidden />}

      <div className="dossier-shell fade-rise-in relative w-full max-w-3xl">
        <div className="vault-modal-shell">
          <button type="button" className="vault-modal-close" aria-label="Close chronicle" onClick={onClose} />
          <div className="vault-modal-body">
            <header className="vault-title-block mb-4">
              <p className="vault-modal-sub font-body">The Chronicles</p>
              <h2 id="chronicle-title" className="vault-modal-title font-heading">
                {report.outcome}
              </h2>
            </header>

            <ol className="chronicle-log">
              {report.lines.map((line) => (
                <li key={line} className="chronicle-line font-body">
                  {line}
                </li>
              ))}
            </ol>

            {claimError && (
              <p className="mb-4 text-center font-body text-sm text-[#ffb4b4]">{claimError}</p>
            )}

            {collapsed && (
              <div className="chronicle-collapse mb-4">
                <p className="font-heading text-2xl text-[#ffb4b4]">Your squad has suffered a mental collapse.</p>
                <p className="mt-2 font-body text-sm text-white/70">
                  The elixir is {ELIXIR_CURE_COST.toLocaleString('en-US')} $RDAV, or they stand on their own in {formatRemaining(report.downForMs)}. You can also heal them later from the barracks.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <RuneButton type="button" glow="amethyst" disabled={phase !== 'open' || sigilBusy} onClick={pay}>
                    Inject Abyssal Elixir —{' '}
                    <span className="font-pixel mx-1">{ELIXIR_CURE_COST.toLocaleString('en-US')}</span>
                  </RuneButton>
                  <RuneButton type="button" glow="runeflame" disabled={phase !== 'open' || sigilBusy} onClick={onClose}>
                    Leave them broken
                  </RuneButton>
                </div>
                {broke && (
                  <p className="mt-3 font-body text-sm text-[#ffb4b4]">The treasury cannot pay the blood price.</p>
                )}
                {phase !== 'open' && (
                  <p className="mt-3 font-body text-xs uppercase tracking-widest text-white/45">
                    Unseal the reliquary before you choose.
                  </p>
                )}
              </div>
            )}

            {cured && (
              <p className="mb-4 text-center font-body text-sm text-antique-gold">The elixir takes. They stand.</p>
            )}

            <div className="reliquary-stage">
              {phase !== 'open' ? (
                <button
                  type="button"
                  className={`reliquary-seal ${phase === 'shaking' || sigilBusy ? 'is-shaking' : ''}`}
                  onClick={unseal}
                  disabled={sigilBusy}
                >
                  <img
                    src="/assets/expeditions/reliquary-closed.png?v=1"
                    alt=""
                    className="reliquary-sprite pixelated"
                    draggable={false}
                  />
                  <span className="reliquary-caption font-heading">{report.reliquary}</span>
                  <span className="reliquary-cta font-heading">
                    {sigilBusy || phase === 'shaking' ? 'The sigil awaits…' : 'Unseal'}
                  </span>
                </button>
              ) : (
                <>
                  <img
                    src="/assets/expeditions/reliquary-open.png?v=1"
                    alt=""
                    className="reliquary-sprite is-open pixelated"
                    draggable={false}
                  />
                  <p className="mb-3 text-center font-heading text-xl text-antique-gold">Spoils of the delve</p>
                  <div className="reliquary-loot">
                    <article className="loot-relic" style={{ animationDelay: '0.05s' }}>
                      <span className="stash-slot loot-slot">
                        <img src="/assets/expeditions/loot-coins.png?v=1" alt="" className="loot-icon pixelated" draggable={false} />
                      </span>
                      <span className="loot-name font-heading">$RDAV</span>
                      <span className="loot-meta font-pixel">{report.rdav.toLocaleString('en-US')}</span>
                    </article>
                    {report.itemKeys.length === 0 && (
                      <article className="loot-relic" style={{ animationDelay: '0.12s' }}>
                        <span className="loot-name font-heading text-white/55">No relic this time</span>
                        <span className="loot-meta font-body text-white/40">Coin alone</span>
                      </article>
                    )}
                    {report.itemKeys.map((key, index) => {
                      const def = getBaseItem(key)
                      const color = def ? RARITY_COLORS[def.rarity] : '#f0d78c'
                      return (
                        <article
                          key={`${key}-${index}`}
                          className="loot-relic"
                          style={{ animationDelay: `${0.14 + index * 0.08}s` }}
                        >
                          <span className="stash-slot loot-slot">
                            <img
                              src={itemSpriteByKey(key) ?? '/assets/expeditions/loot-iron-pickaxe.png?v=1'}
                              alt=""
                              className="loot-icon pixelated"
                              draggable={false}
                            />
                          </span>
                          <span className="loot-name font-heading" style={{ color }}>{def?.name ?? key}</span>
                          <span className="loot-meta font-body" style={{ color }}>{def?.rarity}</span>
                        </article>
                      )
                    })}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <RuneButton type="button" glow="runeflame" onClick={onClose}>
                      Return to the Depths
                    </RuneButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
