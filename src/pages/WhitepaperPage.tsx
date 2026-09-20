/**
 * WhitepaperPage — Abyssal Codex.
 * Layout: sticky section rail + long-form ledger (FishPond / GRIFT guide rhythm).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CODEX_SECTIONS } from '../content/abyssalCodex'

export function WhitepaperPage() {
  const [active, setActive] = useState(CODEX_SECTIONS[0]?.id ?? 'descent')

  useEffect(() => {
    const nodes = CODEX_SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => Boolean(node),
    )
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]?.target.id
        if (top) setActive(top)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.35, 0.55] },
    )

    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const target = document.getElementById(hash)
    if (target) {
      window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [])

  return (
    <main className="codex-page relative min-h-[calc(100vh-3.25rem)]">
      <div className="codex-page-veil" aria-hidden />

      <header className="codex-hero relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-10 text-center md:pt-14">
        <p className="font-body text-[11px] uppercase tracking-[0.32em] text-[#e07070]">Abyssal Vault</p>
        <h1 className="mt-3 font-heading text-4xl text-[#f0d78c] md:text-6xl">The Abyssal Codex</h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-sm leading-relaxed text-white/65 md:text-base">
          The sealed ledger of RuneDelve — descent, blood contracts, black market law, and the $RDAV flywheel.
          Etched for Guild Masters who would command the dark.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/town" className="codex-chip">
            Enter the Sanctum
          </Link>
          <a href="#tokenomics" className="codex-chip codex-chip--ghost">
            Jump to Tokenomics
          </a>
        </div>
      </header>

      <div className="codex-shell relative z-10 mx-auto grid max-w-6xl gap-8 px-4 pb-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className="codex-rail" aria-label="Codex chapters">
          <p className="codex-rail-label">Chapters</p>
          <nav className="codex-rail-nav">
            {CODEX_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`codex-rail-link ${active === section.id ? 'is-active' : ''}`}
                onClick={() => setActive(section.id)}
              >
                <span className="codex-rail-num">{section.number}</span>
                <span className="codex-rail-title">{section.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <article className="codex-ledger">
          {CODEX_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="codex-section scroll-mt-28">
              <header className="codex-section-head">
                <span className="codex-section-num">{section.number}</span>
                <h2 className="codex-section-title font-heading">{section.title}</h2>
              </header>
              <div className="codex-section-body">
                {section.blocks.map((block, index) => {
                  if (block.type === 'h3' && block.text) {
                    return (
                      <h3 key={`${section.id}-h3-${index}`} className="codex-h3">
                        {block.text}
                      </h3>
                    )
                  }
                  if (block.type === 'note' && block.text) {
                    return (
                      <p key={`${section.id}-note-${index}`} className="codex-note">
                        {block.text}
                      </p>
                    )
                  }
                  if (block.type === 'ul' && block.items) {
                    return (
                      <ul key={`${section.id}-ul-${index}`} className="codex-list">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  }
                  if (block.type === 'ol' && block.items) {
                    return (
                      <ol key={`${section.id}-ol-${index}`} className="codex-list codex-list--ordered">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    )
                  }
                  if (block.type === 'p' && block.text) {
                    return (
                      <p key={`${section.id}-p-${index}`} className="codex-p">
                        {block.text}
                      </p>
                    )
                  }
                  return null
                })}
              </div>
            </section>
          ))}

          <footer className="codex-footer">
            <p className="font-body text-xs uppercase tracking-[0.2em] text-white/40">
              For entertainment · Not investment advice · On-chain risk is yours alone
            </p>
            <Link to="/town" className="mt-4 inline-block font-heading text-sm text-antique-gold hover:text-runeflame">
              ← Return to Sanctum Overlook
            </Link>
          </footer>
        </article>
      </div>
    </main>
  )
}

export default WhitepaperPage
