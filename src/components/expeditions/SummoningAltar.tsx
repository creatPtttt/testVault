/**
 * Squad assembly. Click or drag idle mercenaries onto three runic circles.
 * Power totals include equipped gear.
 */

import { useMemo, useState } from 'react'
import { SQUAD_SIZE, type DungeonZoneConfig } from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import type { Delver } from '../../types/game'
import { effectiveStats, isDelverIdle, squadSummary } from '../../utils/squadPower'
import { RuneButton } from '../ui/RuneButton'
import { JOB_PORTRAIT } from '../camp/campSprites'

export interface SummoningAltarProps {
  zone: DungeonZoneConfig
  onClose: () => void
  onDispatched: (names: string) => void
  /** Fired when the chain refuses the descent */
  onRefused?: (reason: string) => void
}

export function SummoningAltar({ zone, onClose, onDispatched, onRefused }: SummoningAltarProps) {
  const { player, dispatchExpedition, sigilBusy } = useGame()
  const [seats, setSeats] = useState<(string | null)[]>(() => Array.from({ length: SQUAD_SIZE }, () => null))

  const seated = useMemo(
    () =>
      seats
        .map((id) => player.delvers.find((delver) => delver.id === id) ?? null)
        .filter((delver): delver is Delver => Boolean(delver)),
    [player.delvers, seats],
  )

  const summary = squadSummary(seated)
  const underpowered = seated.length > 0 && summary.power < zone.requiredPower
  const roster = player.delvers.filter(
    (delver) => isDelverIdle(delver) && !seats.includes(delver.id),
  )

  const place = (id: string, index: number) => {
    setSeats((prev) => {
      const next = [...prev]
      const from = next.indexOf(id)
      const occupant = next[index]
      if (from >= 0) next[from] = occupant ?? null
      next[index] = id
      return next
    })
  }

  const placeFirstEmpty = (id: string) => {
    const index = seats.findIndex((seat) => seat === null)
    if (index < 0) return
    place(id, index)
  }

  const clearSeat = (index: number) => {
    setSeats((prev) => prev.map((seat, i) => (i === index ? null : seat)))
  }

  const dispatch = () => {
    const ids = seats.filter((id): id is string => Boolean(id))
    if (ids.length === 0 || sigilBusy) return
    void dispatchExpedition(zone.id, ids).then((ok) => {
      if (!ok) {
        onRefused?.('The cart would not roll. The seal was refused.')
        return
      }
      const names = seated.map((delver) => delver.name).join(', ')
      onDispatched(names)
      onClose()
    })
  }

  return (
    <div
      className="modal-backdrop-in fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="altar-title"
      onClick={onClose}
    >
      <div className="dossier-shell fade-rise-in relative w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="vault-modal-shell">
          <button type="button" className="vault-modal-close" aria-label="Close summoning altar" onClick={onClose} />
          <div className="vault-modal-body">
            <header className="vault-title-block mb-4">
              <p className="vault-modal-sub font-body">Summoning Altar</p>
              <h2 id="altar-title" className="vault-modal-title font-heading">{zone.name}</h2>
            </header>

            <div className="vault-inset mb-4 flex flex-wrap justify-center gap-6 py-4">
              {seats.map((id, index) => {
                const delver = id ? player.delvers.find((entry) => entry.id === id) : null
                return (
                  <button
                    key={index}
                    type="button"
                    className={`abyss-circle flex flex-col items-center justify-center ${delver ? 'is-filled' : ''}`}
                    onClick={() => {
                      if (delver) clearSeat(index)
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      const dropped = event.dataTransfer.getData('text/plain')
                      if (dropped) place(dropped, index)
                    }}
                  >
                    {delver ? (
                      <>
                        <span className="dossier-portrait-frame abyss-seat-frame">
                          <img src={JOB_PORTRAIT[delver.jobClass]} alt="" className="dossier-portrait-gif pixelated" draggable={false} />
                        </span>
                        <span className="mt-1 max-w-[6rem] truncate font-body text-[11px] text-antique-gold">{delver.name}</span>
                      </>
                    ) : (
                      <span className="font-body text-[11px] uppercase tracking-widest text-white/45">Empty</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="vault-inset mb-4 grid grid-cols-3 gap-3 py-3 text-center">
              <Stat label="Mining" value={summary.mining} />
              <Stat label="Combat" value={summary.power} />
              <Stat label="Luck" value={summary.luck} />
            </div>

            {underpowered && (
              <p className="abyss-warn mb-4 text-center font-body text-sm">
                Power Insufficient: High risk of Incapacitation!
              </p>
            )}

            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {roster.length === 0 && (
                <p className="col-span-full font-body text-sm text-white/60">No idle mercenaries at the fire.</p>
              )}
              {roster.map((delver) => (
                <button
                  key={delver.id}
                  type="button"
                  draggable
                  className="muster-plate"
                  onClick={() => placeFirstEmpty(delver.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', delver.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                >
                  <span className="muster-plate-frame" aria-hidden>
                    <img src={JOB_PORTRAIT[delver.jobClass]} alt="" className="muster-plate-gif pixelated" draggable={false} />
                  </span>
                  <span className="muster-plate-body">
                    <span className="muster-plate-name font-heading">{delver.name}</span>
                    <span className="muster-plate-job font-body">{delver.jobClass}</span>
                    <span className="muster-plate-stats font-body">
                      PWR <span className="font-pixel text-runeflame">{effectiveStats(delver).power}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <RuneButton type="button" glow="runeflame" disabled={seated.length === 0 || sigilBusy} onClick={dispatch}>
                {sigilBusy ? 'Awaiting sigil…' : 'Dispatch Expedition'}
              </RuneButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-body text-[11px] uppercase tracking-widest text-white/50">{label}</p>
      <p className="font-pixel text-xl text-runeflame">{value}</p>
    </div>
  )
}
