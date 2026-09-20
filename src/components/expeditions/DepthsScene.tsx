/**
 * DepthsScene — same playfield as the Sanctum: ground, lifted buildings, gold names.
 * The four mouths sit from the near tunnels back to the void gate.
 */

import { useEffect, useState } from 'react'
import { DUNGEON_ZONES, type DungeonZoneConfig } from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import { expeditionProgress, formatDuration } from '../../utils/squadPower'
import { SceneCornerHud, SceneHudBack, SceneHudPurse } from '../ui/SceneCornerHud'
import { ToastBanner } from '../ui/ToastBanner'
import { ChronicleModal } from './ChronicleModal'
import { SummoningAltar } from './SummoningAltar'

interface Mouth {
  id: string
  /** Short gold name, like Barracks / Bazaar on the Sanctum */
  label: string
  src: string
  left: string
  top: string
  width: string
  labelTop: string
  plaqueSide: 'left' | 'right' | 'top'
  accent: string
}

const MOUTHS: Mouth[] = [
  {
    id: 'zone_4',
    label: 'Void',
    src: '/assets/town/props/depths.png',
    left: '22%',
    top: '0%',
    width: '24%',
    labelTop: '14%',
    plaqueSide: 'right',
    accent: '#9D4EDD',
  },
  {
    id: 'zone_3',
    label: 'Magma',
    src: '/assets/expeditions/zone-crucible.png?v=1',
    left: '48%',
    top: '8%',
    width: '26%',
    labelTop: '36%',
    plaqueSide: 'left',
    accent: '#ff6a1a',
  },
  {
    id: 'zone_2',
    label: 'Crystal Vaults',
    src: '/assets/expeditions/zone-vaults.png?v=1',
    left: '0%',
    top: '28%',
    width: '28%',
    labelTop: '58%',
    plaqueSide: 'right',
    accent: '#3ec6ff',
  },
  {
    id: 'zone_1',
    label: 'Tunnels',
    src: '/assets/expeditions/zone-tunnels.png?v=1',
    left: '26%',
    top: '46%',
    width: '34%',
    labelTop: '90%',
    plaqueSide: 'top',
    accent: '#e08a3c',
  },
]

export function DepthsScene() {
  const { player, fastForwardExpeditions, chainAdmin, vaultMode } = useGame()
  const [now, setNow] = useState(() => Date.now())
  const [hovered, setHovered] = useState<string | null>(null)
  const [zone, setZone] = useState<DungeonZoneConfig | null>(null)
  const [chronicleId, setChronicleId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const active = player.expeditions.filter((entry) => entry.unsealedAt === null)

  return (
    <>
      {toast && (
        <ToastBanner message={toast.message} tone={toast.tone} onClose={() => setToast(null)} durationMs={4800} />
      )}

      <div className={`sanctum-map-stage ${hovered ? 'is-hovering' : ''}`}>
        <div className="sanctum-map-canvas" aria-label="The Sunken Depths">
          <img
            src="/assets/expeditions/abyss-ground.png?v=1"
            alt=""
            className="sanctum-ground pixelated absolute inset-0 h-full w-full select-none object-cover object-center"
            draggable={false}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_60%,transparent_32%,rgba(0,0,0,0.62)_100%)]"
            aria-hidden
          />

          {MOUTHS.map((mouth) => {
            const config = DUNGEON_ZONES.find((entry) => entry.id === mouth.id)
            if (!config) return null
            const isOn = hovered === mouth.id
            return (
              <button
                key={mouth.id}
                type="button"
                className={`sanctum-model ${isOn ? 'is-lifted' : ''}`}
                style={{
                  left: mouth.left,
                  top: mouth.top,
                  width: mouth.width,
                  ['--accent' as string]: mouth.accent,
                  zIndex: isOn ? 20 : 6 + Math.round(parseFloat(mouth.top)),
                }}
                onMouseEnter={() => setHovered(mouth.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(mouth.id)}
                onBlur={() => setHovered(null)}
                onClick={() => setZone(config)}
                aria-label={`Descend into ${config.name}`}
              >
                <span className="sanctum-model-shadow" aria-hidden />
                <span className="sanctum-model-glow" aria-hidden />
                <img src={mouth.src} alt="" className="sanctum-model-sprite pixelated" draggable={false} />
                {isOn && (
                  <span className={`sanctum-plaque sanctum-plaque--${mouth.plaqueSide} tooltip-fade`} role="tooltip">
                    <span className="sanctum-plaque-inner">
                      <span className="sanctum-plaque-title font-heading">{config.name}</span>
                      <span className="sanctum-plaque-body">
                        Power {config.requiredPower} · {formatDuration(config.durationMinutes)} · {config.dangerLevel}
                      </span>
                      <span className="sanctum-plaque-cta font-heading">Descend</span>
                    </span>
                  </span>
                )}
              </button>
            )
          })}

          {active.map((run, index) => {
            const config = DUNGEON_ZONES.find((entry) => entry.id === run.zoneId)
            const progress = expeditionProgress(run, now)
            const ready = progress >= 1
            const left = 18 + progress * 36
            return (
              <button
                key={run.id}
                type="button"
                className={`sanctum-model abyss-cart ${ready ? 'is-lifted' : ''}`}
                style={{
                  left: `${left}%`,
                  top: `${70 + index * 4}%`,
                  width: '13%',
                  ['--accent' as string]: ready ? '#ffb020' : '#8a5a32',
                  zIndex: 40,
                }}
                onClick={() => {
                  if (ready) setChronicleId(run.id)
                }}
                aria-label={
                  ready
                    ? `Unseal reliquary from ${config?.name ?? 'the depths'}`
                    : `${config?.name ?? 'Expedition'} ${Math.floor(progress * 100)} percent`
                }
              >
                <span className="sanctum-model-shadow" aria-hidden />
                <img
                  src="/assets/expeditions/minecart.png?v=1"
                  alt=""
                  className="sanctum-model-sprite pixelated"
                  draggable={false}
                />
                <span className="abyss-cart-name font-heading">
                  {ready ? 'Unseal' : `${Math.floor(progress * 100)}%`}
                </span>
              </button>
            )
          })}

          <div className="sanctum-labels-layer" aria-hidden>
            {MOUTHS.map((mouth) => {
              const mid = parseFloat(mouth.left) + parseFloat(mouth.width) / 2
              return (
                <span
                  key={mouth.id}
                  className={`sanctum-idle-name font-heading ${hovered === mouth.id ? 'is-dimmed' : ''}`}
                  style={{ left: `${mid}%`, top: mouth.labelTop }}
                >
                  {mouth.label}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div className="barracks-title-hud pointer-events-none absolute left-0 right-0 top-3 z-30 flex flex-col items-center px-4">
        <p className="font-heading text-3xl tracking-wide text-antique-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] md:text-4xl">
          The Sunken Depths
        </p>
        <p className="mt-1 max-w-xl text-center font-body text-[10px] uppercase tracking-[0.22em] text-white/55 md:text-xs">
          Choose a gate · The cart keeps rolling if you leave
        </p>
      </div>

      <SceneCornerHud>
        <SceneHudBack />
        <SceneHudPurse
          balance={player.rdavBalance}
          footer={
            vaultMode === 'live' && chainAdmin && active.length > 0 ? (
              <button
                type="button"
                className="mt-2 font-body text-[10px] uppercase tracking-[0.14em] text-[#c4a35a] transition hover:text-[#ffb4a0]"
                onClick={() => {
                  void fastForwardExpeditions()
                }}
              >
                Pull the cart home
              </button>
            ) : null
          }
        />
      </SceneCornerHud>

      {chronicleId && (
        <ChronicleModal expeditionId={chronicleId} onClose={() => setChronicleId(null)} />
      )}

      {zone && (
        <SummoningAltar
          zone={zone}
          onClose={() => setZone(null)}
          onDispatched={(names) =>
            setToast({ tone: 'success', message: `${names} descended into ${zone.name}.` })
          }
          onRefused={(reason) => setToast({ tone: 'error', message: reason })}
        />
      )}
    </>
  )
}
