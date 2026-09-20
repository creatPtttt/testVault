/**
 * ShrinePage — the beta altar. Draw $RDAV once an hour, wake three blades an hour.
 * Success opens a reveal plate so the player sees who answered — not a quiet line of text.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FAUCET_AMOUNT,
  FAUCET_COOLDOWN_MS,
  FAUCET_DRY,
  SUMMON_BROKE,
  SUMMON_COST,
  SUMMON_WINDOW_MS,
  SUMMONS_PER_WINDOW,
} from '../config/gameConfig'
import { useGame } from '../context/GameContext'
import { formatRemaining } from '../utils/squadPower'
import { SummonReveal } from '../components/shrine/SummonReveal'
import { RuneButton } from '../components/ui/RuneButton'
import { ToastBanner } from '../components/ui/ToastBanner'

export function ShrinePage() {
  const { player, claimFaucet, summonAtShrine, vaultNote, sigilBusy } = useGame()
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null)
  const [revealId, setRevealId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const faucetWait = player.lastFaucetAt === 0 ? 0 : Math.max(0, player.lastFaucetAt + FAUCET_COOLDOWN_MS - now)
  const windowOpen = player.summonWindowStart !== 0 && now < player.summonWindowStart + SUMMON_WINDOW_MS
  const used = windowOpen ? player.summonsInWindow : 0
  const offeringsLeft = SUMMONS_PER_WINDOW - used
  const summonWait = windowOpen && offeringsLeft <= 0 ? Math.max(0, player.summonWindowStart + SUMMON_WINDOW_MS - now) : 0

  const liveReveal = revealId ? player.delvers.find((delver) => delver.id === revealId) ?? null : null

  const drawVein = () => {
    if (sigilBusy) return
    void claimFaucet().then((refusal) => {
      if (refusal) {
        setToast({ tone: 'error', message: refusal === FAUCET_DRY ? FAUCET_DRY : refusal })
        return
      }
      setToast({
        tone: 'success',
        message: `${FAUCET_AMOUNT.toLocaleString('en-US')} $RDAV spill across the stone.`,
      })
    })
  }

  const wakeBlade = () => {
    if (sigilBusy) return
    void summonAtShrine().then((outcome) => {
      if (!outcome.ok) {
        setToast({ tone: 'error', message: outcome.reason || SUMMON_BROKE })
        return
      }
      setRevealId(outcome.id)
      setToast({ tone: 'success', message: `${outcome.name} kneels at the altar.` })
    })
  }

  return (
    <main className="shrine-altar relative min-h-[calc(100vh-3.25rem)] px-4 py-8">
      {toast && (
        <ToastBanner
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
          durationMs={5200}
        />
      )}

      {liveReveal && (
        <SummonReveal
          delver={liveReveal}
          onClose={() => setRevealId(null)}
          onWakeAnother={() => {
            setRevealId(null)
            wakeBlade()
          }}
        />
      )}

      <header className="relative z-10 mx-auto mb-6 max-w-5xl text-center">
        <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[#e07070]">The Crimson Altar</p>
        <h1 className="mt-2 font-heading text-4xl text-[#f0d78c] md:text-5xl">The Shrine</h1>
        <p className="mt-2 font-body text-xs uppercase tracking-[0.16em] text-white/55">
          Beta vein · {FAUCET_AMOUNT.toLocaleString('en-US')} $RDAV each hour · three blades each hour
        </p>
        <p className="mt-2 font-body text-[11px] text-antique-gold/80">
          Wallet linked. These rites mint and spend real Devnet $RDAV.
        </p>
        {vaultNote && <p className="mt-1 font-body text-[11px] text-[#e07070]">{vaultNote}</p>}
      </header>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
        <img
          src="/assets/town/props/shrine.png"
          alt=""
          className="shrine-idol pixelated"
          draggable={false}
        />
        <p className="mt-3 font-pixel text-lg text-runeflame">
          {player.rdavBalance.toLocaleString('en-US')} <span className="font-body text-xs">$RDAV</span>
        </p>
      </div>

      <div className="relative z-10 mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-2">
        <section className="vault-inset shrine-rite">
          <h2 className="vault-section-title font-body">The vein</h2>
          <p className="font-heading text-2xl text-antique-gold">Draw beta coin</p>
          <p className="mt-2 font-body text-sm text-white/70">
            The altar pours{' '}
            <span className="font-pixel text-runeflame">{FAUCET_AMOUNT.toLocaleString('en-US')}</span> $RDAV.
            Then it sleeps for an hour.
          </p>
          <p className="mt-2 font-body text-xs text-[#e07070]">
            {faucetWait > 0 ? `Refills in ${formatRemaining(faucetWait)}` : 'The vein is open.'}
          </p>
          <div className="mt-4">
            <RuneButton type="button" glow="runeflame" disabled={faucetWait > 0 || sigilBusy} onClick={drawVein}>
              {sigilBusy ? 'Awaiting sigil…' : `Draw ${FAUCET_AMOUNT.toLocaleString('en-US')} $RDAV`}
            </RuneButton>
          </div>
        </section>

        <section className="vault-inset shrine-rite">
          <h2 className="vault-section-title font-body">The offering</h2>
          <p className="font-heading text-2xl text-antique-gold">Wake a blade</p>
          <p className="mt-2 font-body text-sm text-white/70">
            Spend <span className="font-pixel text-runeflame">{SUMMON_COST}</span> $RDAV. The altar rolls job, rarity, and temper.
          </p>
          <p className="mt-2 font-body text-xs text-[#e07070]">
            {offeringsLeft > 0
              ? `${offeringsLeft} of ${SUMMONS_PER_WINDOW} offerings left this hour`
              : `The altar rests ${formatRemaining(summonWait)}`}
          </p>
          <div className="mt-4">
            <RuneButton
              type="button"
              glow="amethyst"
              disabled={offeringsLeft <= 0 || player.rdavBalance < SUMMON_COST || sigilBusy}
              onClick={wakeBlade}
            >
              {sigilBusy ? 'Awaiting sigil…' : `Offer ${SUMMON_COST} $RDAV`}
            </RuneButton>
          </div>
        </section>
      </div>

      <div className="relative z-10 mx-auto mt-8 max-w-5xl">
        <Link to="/town" className="font-heading text-sm text-antique-gold hover:text-runeflame">
          ← Sanctum Overlook
        </Link>
      </div>
    </main>
  )
}

export default ShrinePage
