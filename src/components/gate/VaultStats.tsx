/**
 * VaultStats — three separate queryable ledger plates (Dark Dwellers frames).
 * Each plate is its own control so later we can open detail drawers / explorers.
 */

import { VAULT_GLOBAL_STATS } from '../../config/gameConfig'

function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

const STATS = [
  {
    id: 'reserves',
    label: 'Abyssal Reserves',
    value: `${formatCount(VAULT_GLOBAL_STATS.abyssalReserves)} $RDAV`,
    hint: 'Inspect vault reserves',
  },
  {
    id: 'expeditions',
    label: 'Expeditions',
    value: formatCount(VAULT_GLOBAL_STATS.expeditionsLaunched),
    hint: 'Inspect expedition ledger',
  },
  {
    id: 'reliquaries',
    label: 'Reliquaries',
    value: formatCount(VAULT_GLOBAL_STATS.reliquariesUnsealed),
    hint: 'Inspect reliquary ledger',
  },
] as const

export function VaultStats() {
  return (
    <section className="vault-stats mx-auto max-w-4xl px-4 pb-6 pt-2" aria-label="Vault global statistics">
      <div className="vault-stats-grid">
        {STATS.map((stat) => (
          <button
            key={stat.id}
            type="button"
            className="vault-stat-plate"
            aria-label={stat.hint}
            title={stat.hint}
            onClick={() => {
              // Placeholder — wire to query / detail view later
              console.info(`[vault] query ${stat.id}`)
            }}
          >
            <p className="vault-stat-label font-body">{stat.label}</p>
            <p className="vault-stat-value font-pixel">{stat.value}</p>
            <span className="vault-stat-cue font-body">Query</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default VaultStats
