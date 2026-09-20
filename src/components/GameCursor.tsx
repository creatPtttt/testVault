/**
 * GameCursor — pixel cursors for RuneDelve.
 * IndigoLay Lite Wait animation while the sigil is busy.
 * Default / hand come from Kenney CC0; blade from IndigoLay Attack.
 */

import { useEffect } from 'react'
import { useGame } from '../context/GameContext'

const WAIT_FRAMES = [
  '/assets/ui/cursors/UI_Cursor_Wait_01_32.png',
  '/assets/ui/cursors/UI_Cursor_Wait_02_32.png',
  '/assets/ui/cursors/UI_Cursor_Wait_03_32.png',
  '/assets/ui/cursors/UI_Cursor_Wait_04_32.png',
]

export function GameCursor() {
  const { sigilBusy } = useGame()

  useEffect(() => {
    const root = document.documentElement
    if (!sigilBusy) {
      root.classList.remove('is-sigil-busy')
      root.style.removeProperty('--cursor-wait-frame')
      return
    }

    root.classList.add('is-sigil-busy')
    let frame = 0
    const tick = () => {
      root.style.setProperty('--cursor-wait-frame', `url('${WAIT_FRAMES[frame]}')`)
      frame = (frame + 1) % WAIT_FRAMES.length
    }
    tick()
    const id = window.setInterval(tick, 180)
    return () => {
      window.clearInterval(id)
      root.classList.remove('is-sigil-busy')
      root.style.removeProperty('--cursor-wait-frame')
    }
  }, [sigilBusy])

  return null
}

export default GameCursor
