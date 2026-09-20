/**
 * GateSeal — two straight corner-to-corner chain diagonals (true X).
 * Transparent chain tiles only — no solid brown band behind them.
 * Seal sits at the geometric cross (viewport center). Unlock → /town.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

export interface GateSealHandle {
  unlock: () => void
}

interface GateSealProps {
  onUnlocked: () => void
}

const SHARDS = [
  { id: 0, x: 42, y: 38, rot: -18, dx: -28, dy: -22, delay: 0 },
  { id: 1, x: 52, y: 36, rot: 22, dx: 30, dy: -26, delay: 40 },
  { id: 2, x: 40, y: 52, rot: -40, dx: -34, dy: 18, delay: 70 },
  { id: 3, x: 55, y: 54, rot: 35, dx: 36, dy: 24, delay: 90 },
  { id: 4, x: 46, y: 44, rot: 8, dx: -12, dy: -38, delay: 50 },
  { id: 5, x: 50, y: 48, rot: -12, dx: 14, dy: 40, delay: 110 },
  { id: 6, x: 38, y: 44, rot: 50, dx: -42, dy: 6, delay: 130 },
  { id: 7, x: 58, y: 46, rot: -55, dx: 44, dy: -8, delay: 150 },
]

type DiagLayout = {
  /** NW↔SE continuous diagonal */
  a: { rot: number; len: number }
  /** NE↔SW continuous diagonal */
  b: { rot: number; len: number }
}

function playSfx(src: string, volume = 0.55) {
  try {
    const a = new Audio(src)
    a.volume = volume
    void a.play()
  } catch {
    /* ignore */
  }
}

/**
 * One strip covers a full corner↔corner diagonal.
 * Strip grows along +Y; CSS rotate is clockwise → rot = -atan2(dx, dy).
 */
function layoutDiagonals(vw: number, vh: number): DiagLayout {
  const pad = 80
  // Direction from center toward SE / SW (half-diagonal; strip length is full diagonal)
  const seDx = vw / 2
  const seDy = vh / 2
  const swDx = -vw / 2
  const swDy = vh / 2
  const len = Math.hypot(vw, vh) + pad
  return {
    a: { rot: (-Math.atan2(seDx, seDy) * 180) / Math.PI, len },
    b: { rot: (-Math.atan2(swDx, swDy) * 180) / Math.PI, len },
  }
}

export const GateSeal = forwardRef<GateSealHandle, GateSealProps>(function GateSeal(
  { onUnlocked },
  ref,
) {
  const [phase, setPhase] = useState<'sealed' | 'unlocking' | 'open'>('sealed')
  const [awake, setAwake] = useState(false)
  const [diags, setDiags] = useState<DiagLayout>(() =>
    typeof window !== 'undefined'
      ? layoutDiagonals(window.innerWidth, window.innerHeight)
      : { a: { rot: -45, len: 2000 }, b: { rot: 45, len: 2000 } },
  )
  const busy = useRef(false)

  useEffect(() => {
    const sync = () => setDiags(layoutDiagonals(window.innerWidth, window.innerHeight))
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const runUnlock = () => {
    if (busy.current || phase !== 'sealed') return
    busy.current = true
    setPhase('unlocking')

    playSfx('/assets/sfx/lock-open.ogg', 0.65)
    window.setTimeout(() => playSfx('/assets/sfx/unlock.ogg', 0.5), 120)
    window.setTimeout(() => playSfx('/assets/sfx/chain-snap.ogg', 0.55), 280)
    window.setTimeout(() => playSfx('/assets/sfx/chain-fall.ogg', 0.45), 420)

    window.setTimeout(() => {
      setPhase('open')
      onUnlocked()
    }, 1600)
  }

  useImperativeHandle(ref, () => ({ unlock: runUnlock }))

  const fieldClass = `gate-x-field gate-x-field--${phase} ${awake ? 'is-awake' : ''}`

  return (
    <>
      <div className={`${fieldClass} gate-x-field--chains`} aria-hidden>
        {/* Two continuous corner↔corner strips — straight X, transparent tiles only */}
        <div
          className="gate-x-diag gate-x-diag--a"
          style={
            {
              '--diag-rot': `${diags.a.rot}deg`,
              '--diag-len': `${diags.a.len}px`,
            } as CSSProperties
          }
        />
        <div
          className="gate-x-diag gate-x-diag--b"
          style={
            {
              '--diag-rot': `${diags.b.rot}deg`,
              '--diag-len': `${diags.b.len}px`,
            } as CSSProperties
          }
        />

        {SHARDS.map((s) => (
          <img
            key={s.id}
            src={`/assets/ui/seal/chain-link-${s.id % 6}.png`}
            alt=""
            className="gate-x-shard pixelated"
            style={
              {
                left: `${s.x}%`,
                top: `${s.y}%`,
                '--dx': `${s.dx}vw`,
                '--dy': `${s.dy}vh`,
                '--rot': `${s.rot}deg`,
                animationDelay: `${s.delay}ms`,
              } as CSSProperties
            }
            draggable={false}
          />
        ))}
      </div>

      <div className={`${fieldClass} gate-x-field--seal`} aria-hidden={phase === 'open'}>
        <button
          type="button"
          className="gate-x-seal"
          onMouseEnter={() => setAwake(true)}
          onMouseLeave={() => setAwake(false)}
          onClick={runUnlock}
          disabled={phase !== 'sealed'}
          aria-label="Touch the Seal to unbind the chains and enter the Sanctum"
        >
          <span className="gate-x-seal-glow" aria-hidden />
          <img
            src="/assets/ui/brand-rune-seal.png?v=3"
            alt=""
            className="gate-x-seal-core pixelated"
            draggable={false}
          />
          <img
            src="/assets/ui/seal/padlock.png"
            alt=""
            className="gate-x-padlock pixelated"
            draggable={false}
            aria-hidden
          />
          <span className="gate-x-hint font-heading">
            {phase === 'unlocking' ? 'Unsealing…' : phase === 'open' ? 'The Seal Breaks' : 'Touch the Seal'}
          </span>
        </button>
      </div>
    </>
  )
})

export default GateSeal
