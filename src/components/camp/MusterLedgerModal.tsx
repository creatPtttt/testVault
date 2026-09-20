/**
 * MusterLedgerModal — Abyss parchment shell (distinct from Gate Dragon chrome).
 */

import { useMemo, useState } from 'react'
import type { Delver, JobClass, Rarity } from '../../types/game'
import { RuneSelect } from '../ui/RuneSelect'
import { DelverLedgerCard } from './DelverLedgerCard'

const JOB_OPTIONS: Array<{ value: 'All' | JobClass; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'Breaker Paladin', label: 'Breaker Paladin' },
  { value: 'Rune Arcanist', label: 'Rune Arcanist' },
  { value: 'Ashen Rogue', label: 'Ashen Rogue' },
  { value: 'Vault Geomancer', label: 'Vault Geomancer' },
  { value: 'Sanity Warden', label: 'Sanity Warden' },
]

const RARITY_OPTIONS: Array<{ value: 'All' | Rarity; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'Common', label: 'Common' },
  { value: 'Uncommon', label: 'Uncommon' },
  { value: 'Rare', label: 'Rare' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Legendary', label: 'Legendary' },
  { value: 'Abyssal', label: 'Abyssal' },
]

export interface MusterLedgerModalProps {
  delvers: Delver[]
  onClose: () => void
  onInspect: (delver: Delver) => void
}

export function MusterLedgerModal({ delvers, onClose, onInspect }: MusterLedgerModalProps) {
  const [job, setJob] = useState<(typeof JOB_OPTIONS)[number]['value']>('All')
  const [rarity, setRarity] = useState<(typeof RARITY_OPTIONS)[number]['value']>('All')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return delvers.filter((d) => {
      if (job !== 'All' && d.jobClass !== job) return false
      if (rarity !== 'All' && d.rarity !== rarity) return false
      if (q && !d.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [delvers, job, rarity, query])

  return (
    <div
      className="modal-backdrop-in fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm md:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="muster-ledger-title"
      onClick={onClose}
    >
      <div className="muster-ledger fade-rise-in" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-shell">
          <button
            type="button"
            onClick={onClose}
            className="vault-modal-close"
            aria-label="Close Muster Ledger"
          />

          <header className="vault-modal-header">
            <div className="vault-title-block">
              <h2 id="muster-ledger-title" className="vault-modal-title font-heading">
                Muster Ledger
              </h2>
              <p className="vault-modal-sub font-body">
                The host by the fire · Filter · Open a dossier
              </p>
            </div>
            <p className="vault-modal-count font-body">
              <span className="font-pixel text-runeflame">{filtered.length}</span>
              <span className="text-white/30"> / </span>
              <span className="font-pixel text-antique-gold/85">{delvers.length}</span>
              <span className="ml-1 text-[10px] uppercase tracking-wider text-white/40">blades</span>
            </p>
          </header>

          <div className="muster-ledger-filters">
            <label className="muster-ledger-field font-body">
              <span>Search</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name…"
                className="muster-ledger-input"
              />
            </label>
            <RuneSelect
              label="Job"
              value={job}
              options={JOB_OPTIONS}
              onChange={setJob}
            />
            <RuneSelect
              label="Rarity"
              value={rarity}
              options={RARITY_OPTIONS}
              onChange={setRarity}
            />
          </div>

          <div className="vault-modal-body">
            {filtered.length === 0 ? (
              <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 text-center">
                <p className="font-heading text-2xl text-antique-gold">No Blades Match</p>
                <p className="mt-2 max-w-md font-body text-sm text-white/55">
                  {delvers.length === 0
                    ? 'Offer 50 $RDAV at the Shrine to seal the first blood contract.'
                    : 'Clear filters or soften the search.'}
                </p>
              </div>
            ) : (
              <div className="muster-ledger-grid">
                {filtered.map((d) => (
                  <DelverLedgerCard
                    key={d.id}
                    delver={d}
                    onInspect={(delver) => {
                      onInspect(delver)
                      onClose()
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MusterLedgerModal
