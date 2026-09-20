/**
 * GrimoireSteps — interactive ritual tablets (hover awaken).
 */

import { STARTER_ZONE } from '../../config/gameConfig'

interface GrimoireStep {
  step: number
  title: string
  body: string
}

const STEPS: GrimoireStep[] = [
  {
    step: 1,
    title: 'Blood Contract',
    body: 'Recruit your unique Delvers.',
  },
  {
    step: 2,
    title: 'Abyssal Delve',
    body: `Dispatch your squad into ${STARTER_ZONE.name}.`,
  },
  {
    step: 3,
    title: 'Unseal Reliquary',
    body: 'Defeat foes and loot $RDAV & gear.',
  },
  {
    step: 4,
    title: "Smuggler's Den",
    body: 'Trade mercenaries and artifacts freely.',
  },
]

export function GrimoireSteps() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-4" aria-labelledby="grimoire-heading">
      <h2 id="grimoire-heading" className="mb-6 text-center font-heading text-3xl text-[#f0d78c] md:text-4xl">
        The Grimoire
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ step, title, body }) => (
          <article key={step} className="game-tablet group" tabIndex={0}>
            <span className="font-pixel text-xs text-amethyst">0{step}</span>
            <h3 className="mt-2 font-heading text-xl tracking-wide text-[#e8c56a] transition-colors group-hover:text-[#ffe6a0]">
              {title}
            </h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-white/72">{body}</p>
            <span className="game-tablet-ember" aria-hidden />
          </article>
        ))}
      </div>
    </section>
  )
}

export default GrimoireSteps
