/**
 * PlaceholderPage — Phase stub for Hallway destinations not yet built.
 */

import { Link } from 'react-router-dom'
import { StonePanel } from '../components/ui/StonePanel'
import { RuneButton } from '../components/ui/RuneButton'

/** Props for a hallway placeholder chamber */
export interface PlaceholderPageProps {
  /** Cinzel page title */
  title: string
  /** Which future phase this awaits */
  awaitingPhase: string
  /** Short body description */
  blurb: string
}

/**
 * Shared stone chamber for /expeditions, /bazaar, /shrine.
 */
export function PlaceholderPage({ title, awaitingPhase, blurb }: PlaceholderPageProps) {
  return (
    <main className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(157,78,221,0.1),transparent_60%)]"
        aria-hidden
      />
      <StonePanel className="w-full border-[3px] p-8 text-center shadow-[0_0_32px_rgba(184,134,11,0.25)]">
        <h1 className="font-heading text-3xl text-antique-gold drop-shadow-[0_0_14px_rgba(184,134,11,0.55)] md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-white/70">{blurb}</p>
        <p className="mt-3 font-body text-xs uppercase tracking-widest text-runeflame/80">
          Awaiting {awaitingPhase}
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/camp">
            <RuneButton type="button" glow="runeflame">
              Return to Barracks
            </RuneButton>
          </Link>
        </div>
      </StonePanel>
    </main>
  )
}
