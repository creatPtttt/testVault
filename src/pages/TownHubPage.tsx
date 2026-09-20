/**
 * TownHubPage — layered building models + pixel RPG plaque tooltips.
 * Map sits in a fixed 16:9 canvas so maximize vs window keeps the same layout.
 * Idle names live in a separate top layer so they are never covered by neighbors.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SceneCornerHud, SceneHudPurse } from '../components/ui/SceneCornerHud'
import { useGame } from '../context/GameContext'

interface BuildingModel {
  id: string
  /** Short Diablo-style name (no leading "The") */
  name: string
  blurb: string
  to: string
  src: string
  accent: string
  left: string
  top: string
  width: string
  /** Vertical anchor for the gold name (canvas %), kept clear of other models */
  labelTop: string
  /** Where the hover plaque anchors relative to the model */
  plaqueSide: 'left' | 'right' | 'top'
}

const BUILDINGS: BuildingModel[] = [
  {
    id: 'barracks',
    name: 'Barracks',
    blurb: 'Muster delvers, open the stash, and seal blood contracts.',
    to: '/camp',
    src: '/assets/town/props/barracks.png',
    accent: '#00F0FF',
    left: '7%',
    top: '5%',
    width: '28%',
    labelTop: '40%',
    plaqueSide: 'right',
  },
  {
    id: 'depths',
    name: 'Depths',
    blurb: 'Descend the sealed stair into lost god-temples.',
    to: '/expeditions',
    src: '/assets/town/props/depths.png',
    accent: '#9D4EDD',
    left: '36%',
    top: '1%',
    width: '30%',
    labelTop: '52%',
    plaqueSide: 'left',
  },
  {
    id: 'bazaar',
    name: 'Bazaar',
    blurb: 'Trade relics and hire blades under lantern light.',
    to: '/bazaar',
    src: '/assets/town/props/bazaar.png',
    accent: '#B8860B',
    left: '58%',
    top: '28%',
    width: '30%',
    labelTop: '72%',
    plaqueSide: 'top',
  },
  {
    id: 'shrine',
    name: 'Shrine',
    blurb: 'Draw beta coin and wake a blade. Three offerings an hour.',
    to: '/shrine',
    src: '/assets/town/props/shrine.png',
    accent: '#EF4444',
    left: '14%',
    top: '50%',
    width: '26%',
    labelTop: '88%',
    plaqueSide: 'top',
  },
]

export function TownHubPage() {
  const navigate = useNavigate()
  const { player } = useGame()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <main className="sanctum-immersive relative h-[calc(100vh-3.25rem)] w-full overflow-hidden bg-obsidian">
      <div className={`sanctum-map-stage ${hovered ? 'is-hovering' : ''}`}>
        <div className="sanctum-map-canvas">
          <img
            src="/assets/town/sanctum-ground.png"
            alt=""
            className="sanctum-ground pixelated absolute inset-0 h-full w-full select-none object-cover object-center"
            draggable={false}
            aria-hidden
          />

          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]"
            aria-hidden
          />

          {BUILDINGS.map((b) => {
            const isOn = hovered === b.id
            return (
              <button
                key={b.id}
                type="button"
                className={`sanctum-model ${isOn ? 'is-lifted' : ''}`}
                style={{
                  left: b.left,
                  top: b.top,
                  width: b.width,
                  ['--accent' as string]: b.accent,
                  zIndex: isOn ? 20 : 5 + Math.round(parseFloat(b.top)),
                }}
                onMouseEnter={() => setHovered(b.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(b.id)}
                onBlur={() => setHovered(null)}
                onClick={() => navigate(b.to)}
                aria-label={`Enter ${b.name}`}
              >
                <span className="sanctum-model-shadow" aria-hidden />
                <span className="sanctum-model-glow" aria-hidden />

                <img
                  src={b.src}
                  alt=""
                  className="sanctum-model-sprite pixelated"
                  draggable={false}
                />

                {isOn && (
                  <span
                    className={`sanctum-plaque sanctum-plaque--${b.plaqueSide} tooltip-fade`}
                    role="tooltip"
                  >
                    <span className="sanctum-plaque-inner">
                      <span className="sanctum-plaque-title font-heading">{b.name}</span>
                      <span className="sanctum-plaque-body">{b.blurb}</span>
                      <span className="sanctum-plaque-cta font-heading">Enter</span>
                    </span>
                  </span>
                )}
              </button>
            )
          })}

          {/* Names above every building — survives maximize / z-index stacking */}
          <div className="sanctum-labels-layer" aria-hidden>
            {BUILDINGS.map((b) => {
              const mid = parseFloat(b.left) + parseFloat(b.width) / 2
              return (
                <span
                  key={`label-${b.id}`}
                  className={`sanctum-idle-name font-heading ${
                    hovered === b.id ? 'is-dimmed' : ''
                  }`}
                  style={{ left: `${mid}%`, top: b.labelTop }}
                >
                  {b.name}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <SceneCornerHud>
        <SceneHudPurse balance={player.rdavBalance} />
      </SceneCornerHud>
    </main>
  )
}

export default TownHubPage
