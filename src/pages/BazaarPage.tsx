/**
 * BazaarPage — the Smuggler's Den. Two ledgers: the hall, and your own consignments.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BlackMarket } from '../components/bazaar/BlackMarket'
import { MyConsignments } from '../components/bazaar/MyConsignments'

type DenTab = 'market' | 'mine'

export function BazaarPage() {
  const [tab, setTab] = useState<DenTab>('market')

  return (
    <main className="bazaar-den relative min-h-[calc(100vh-3.25rem)] px-4 py-8">
      <div className="bazaar-flicker" aria-hidden />
      <header className="relative z-10 mx-auto mb-6 max-w-5xl text-center">
        <p className="font-body text-[11px] uppercase tracking-[0.28em] text-amethyst">Smuggler's Den</p>
        <h1 className="mt-2 font-heading text-4xl text-[#f0d78c] md:text-5xl">The Black Market</h1>
        <p className="mt-2 font-body text-xs uppercase tracking-[0.18em] text-white/55">
          Coin is $RDAV alone · The Guild drinks 3% of every sale
        </p>
      </header>

      <div className="relative z-10 mx-auto mb-6 flex max-w-5xl justify-center gap-3">
        <button
          type="button"
          className={`bazaar-tab font-heading ${tab === 'market' ? 'is-on' : ''}`}
          onClick={() => setTab('market')}
        >
          Black Market
        </button>
        <button
          type="button"
          className={`bazaar-tab font-heading ${tab === 'mine' ? 'is-on' : ''}`}
          onClick={() => setTab('mine')}
        >
          My Consignments
        </button>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {tab === 'market' ? <BlackMarket /> : <MyConsignments />}
      </div>

      <div className="relative z-10 mx-auto mt-8 max-w-5xl">
        <Link to="/town" className="font-heading text-sm text-antique-gold hover:text-runeflame">
          ← Sanctum Overlook
        </Link>
      </div>
    </main>
  )
}

export default BazaarPage
