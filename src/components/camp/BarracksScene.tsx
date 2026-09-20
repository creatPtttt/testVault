/**
 * BarracksScene — Vault + Muster Fire buildings; ledger opens from the fire.
 */

import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import type { Delver } from '../../types/game'
import { SceneCornerHud, SceneHudAction, SceneHudBack, SceneHudPurse } from '../ui/SceneCornerHud'
import { ToastBanner } from '../ui/ToastBanner'
import { DelverModal } from './DelverModal'
import { MusterLedgerModal } from './MusterLedgerModal'
import { StashModal } from './StashModal'

export function BarracksScene() {
  const { player } = useGame()
  const [selected, setSelected] = useState<Delver | null>(null)
  const [stashOpen, setStashOpen] = useState(false)
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const count = player.delvers.length

  return (
    <>
      {toast && (
        <ToastBanner message={toast} tone="success" onClose={() => setToast(null)} durationMs={4200} />
      )}
      <div className={`sanctum-map-stage barracks-camp ${hovered ? 'is-hovering' : ''}`}>
        <div className="sanctum-map-canvas" aria-label="Vanguard Barracks">
          <img
            src="/assets/camp/barracks-yard.png?v=1"
            alt=""
            className="sanctum-ground pixelated absolute inset-0 h-full w-full select-none object-cover object-center"
            draggable={false}
            aria-hidden
          />

          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_55%,transparent_28%,rgba(0,0,0,0.55)_100%)]"
            aria-hidden
          />

          <div className="barracks-embers z-[2]" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>

          {/* Armory Vault */}
          <button
            type="button"
            className={`sanctum-model barracks-vault ${hovered === 'vault' ? 'is-lifted' : ''}`}
            style={{
              left: '3%',
              top: '10%',
              width: '24%',
              ['--accent' as string]: '#B8860B',
              zIndex: hovered === 'vault' ? 20 : 6,
            }}
            onMouseEnter={() => setHovered('vault')}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered('vault')}
            onBlur={() => setHovered(null)}
            onClick={() => setStashOpen(true)}
            aria-label="Open The Stash — Armory Vault"
          >
            <span className="sanctum-model-shadow" aria-hidden />
            <span className="sanctum-model-glow" aria-hidden />
            <img
              src="/assets/camp/armory-vault.png?v=7"
              alt=""
              className="sanctum-model-sprite pixelated"
              draggable={false}
            />
            {hovered === 'vault' && (
              <span className="sanctum-plaque sanctum-plaque--right tooltip-fade" role="tooltip">
                <span className="sanctum-plaque-inner">
                  <span className="sanctum-plaque-title font-heading">Armory Vault</span>
                  <span className="sanctum-plaque-body">
                    Ironbound stores for pickaxes, armor, and blood-contract spoils.
                  </span>
                  <span className="sanctum-plaque-cta font-heading">Open Stash</span>
                </span>
              </span>
            )}
          </button>

          {/* Muster Fire — interactive building (opens ledger) */}
          <button
            type="button"
            className={`sanctum-model barracks-fire ${hovered === 'fire' ? 'is-lifted' : ''}`}
            style={{
              left: '38%',
              top: '22%',
              width: '36%',
              ['--accent' as string]: '#ff7a28',
              zIndex: hovered === 'fire' ? 20 : 7,
            }}
            onMouseEnter={() => setHovered('fire')}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered('fire')}
            onBlur={() => setHovered(null)}
            onClick={() => setLedgerOpen(true)}
            aria-label="Open Muster Ledger — Muster Fire"
          >
            <span className="sanctum-model-shadow" aria-hidden />
            <span className="sanctum-model-glow" aria-hidden />
            <img
              src="/assets/camp/muster-fire.png?v=1"
              alt=""
              className="sanctum-model-sprite pixelated"
              draggable={false}
            />
            {hovered === 'fire' && (
              <span className="sanctum-plaque sanctum-plaque--left tooltip-fade" role="tooltip">
                <span className="sanctum-plaque-inner">
                  <span className="sanctum-plaque-title font-heading">Muster Fire</span>
                  <span className="sanctum-plaque-body">
                    The host rests by these flames. Open the ledger to manage every blade.
                  </span>
                  <span className="sanctum-plaque-cta font-heading">Open Ledger</span>
                </span>
              </span>
            )}
          </button>

          <div className="sanctum-labels-layer" aria-hidden>
            <span
              className={`sanctum-idle-name font-heading ${hovered === 'vault' ? 'is-dimmed' : ''}`}
              style={{ left: '15%', top: '52%' }}
            >
              Armory Vault
            </span>
            <span
              className={`sanctum-idle-name font-heading ${hovered === 'fire' ? 'is-dimmed' : ''}`}
              style={{ left: '56%', top: '72%' }}
            >
              Muster Fire
            </span>
          </div>
        </div>
      </div>

      <div className="barracks-title-hud pointer-events-none absolute left-0 right-0 top-3 z-30 flex flex-col items-center px-4">
        <p className="font-heading text-3xl tracking-wide text-antique-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] md:text-4xl">
          The Vanguard Barracks
        </p>
        <p className="mt-1 max-w-xl text-center font-body text-[10px] uppercase tracking-[0.22em] text-white/55 md:text-xs">
          Muster Fire opens the ledger · Vault opens the stash
        </p>
      </div>

      <SceneCornerHud>
        <SceneHudBack />
        <SceneHudPurse label="Barracks Treasury" balance={player.rdavBalance} />
        <SceneHudAction
          title="Muster Ledger"
          detail={
            <>
              <span className="font-pixel text-xs text-[#f0d78c]">{count}</span>
              <span className="font-body text-[10px] text-white/50"> blades sealed</span>
            </>
          }
          onClick={() => setLedgerOpen(true)}
        />
      </SceneCornerHud>

      {ledgerOpen && (
        <MusterLedgerModal
          delvers={player.delvers}
          onClose={() => setLedgerOpen(false)}
          onInspect={setSelected}
        />
      )}

      {selected && (
        <DelverModal
          delver={selected}
          onClose={() => setSelected(null)}
          onOpenStash={() => setStashOpen(true)}
        />
      )}

      {stashOpen && (
        <StashModal
          onClose={() => setStashOpen(false)}
          equipTargetId={selected?.id ?? null}
          onEquipped={() => {
            setToast('Relic strapped. The dossier holds the new loadout.')
            setStashOpen(false)
          }}
        />
      )}
    </>
  )
}

export default BarracksScene
