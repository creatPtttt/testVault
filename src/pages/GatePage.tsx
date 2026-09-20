/**
 * GatePage — homepage sealed by a full-viewport chain X.
 * Anyone may break the seal into /town. Buildings ask for a Devnet wallet later.
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RuneButton } from '../components/ui/RuneButton'
import { FloatingEmbers } from '../components/gate/FloatingEmbers'
import { GateSeal, type GateSealHandle } from '../components/gate/GateSeal'
import { VaultStats } from '../components/gate/VaultStats'
import { GrimoireSteps } from '../components/gate/GrimoireSteps'
import { startAbyssVeil } from '../components/layout/PageTransition'

export function GatePage() {
  const navigate = useNavigate()
  const sealRef = useRef<GateSealHandle>(null)

  const afterUnlock = () => {
    startAbyssVeil(() => navigate('/town'), 200)
  }

  return (
    <main className="gate-page relative min-h-screen overflow-x-hidden text-white">
      <div className="gate-world-bg" aria-hidden>
        <div
          className="gate-world-bg-img"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        <div className="gate-world-bg-veil" />
      </div>

      <FloatingEmbers />

      <GateSeal ref={sealRef} onUnlocked={afterUnlock} />

      <section className="gate-hero relative z-20 flex min-h-[72vh] flex-col items-center px-4 pb-8 pt-16 text-center md:min-h-[68vh] md:pt-14">
        <div className="gate-hero-stack gate-hero-stack--top">
          <p className="gate-kicker font-body">Abyssal Vault</p>
          <h1 id="gate-hero-brand" className="gate-title font-heading">
            RuneDelve
          </h1>
          <p className="gate-tagline font-body">
            Muster mercenaries, unseal reliquaries, and trade in the dark.
          </p>
          <p className="mt-3 max-w-lg font-body text-xs text-white/55">
            Walk the Sanctum first. When you enter a building you will bind a Phantom wallet on{' '}
            <span className="text-antique-gold">Solana Devnet</span> — free test SOL, no Mainnet coin needed.
          </p>
        </div>

        <div className="gate-hero-seal-space" aria-hidden />
      </section>

      <div className="gate-seal-cta">
        <RuneButton
          type="button"
          variant="hero"
          glow="runeflame"
          onClick={() => sealRef.current?.unlock()}
        >
          Break the Seal
        </RuneButton>
      </div>

      <div className="relative z-10">
        <VaultStats />
        <GrimoireSteps />
      </div>
    </main>
  )
}

export default GatePage
