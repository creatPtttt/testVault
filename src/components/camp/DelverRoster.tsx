/**
 * DelverRoster — CSS grid of DelverCard mini-panels + inspect modal.
 */

import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import type { Delver } from '../../types/game'
import { StonePanel } from '../ui/StonePanel'
import { DelverCard } from './DelverCard'
import { DelverModal } from './DelverModal'

export function DelverRoster() {
  const { player } = useGame()
  const [selected, setSelected] = useState<Delver | null>(null)

  if (player.delvers.length === 0) {
    return (
      <StonePanel className="mx-auto max-w-xl p-8 text-center">
        <h3 className="font-heading text-2xl text-antique-gold drop-shadow-[0_0_10px_rgba(184,134,11,0.45)]">
          The Barracks Stand Empty
        </h3>
        <p className="mt-4 font-body text-sm leading-relaxed text-white/75">
          No blood contracts have been sealed. Walk to the{' '}
          <Link to="/shrine" className="text-antique-gold">
            Shrine
          </Link>{' '}
          and offer 50 $RDAV to wake the first blade.
        </p>
      </StonePanel>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {player.delvers.map((delver) => (
          <DelverCard key={delver.id} delver={delver} onInspect={setSelected} />
        ))}
      </div>

      {selected && (
        <DelverModal delver={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

export default DelverRoster
