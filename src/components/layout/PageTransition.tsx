/**
 * PageTransition — abyss veil for route changes (cover → navigate → reveal).
 */

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

type Phase = 'idle' | 'cover' | 'reveal'

export function PageTransition() {
  const location = useLocation()
  const [phase, setPhase] = useState<Phase>('idle')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onVeil = () => setPhase('cover')
    window.addEventListener('rdav-veil', onVeil)
    return () => window.removeEventListener('rdav-veil', onVeil)
  }, [])

  useEffect(() => {
    // Ignore first mount so Gate does not veil on load
    if (!ready) {
      setReady(true)
      return
    }

    setPhase((prev) => (prev === 'cover' ? 'reveal' : 'cover'))

    const toReveal = window.setTimeout(() => {
      setPhase((prev) => (prev === 'cover' ? 'reveal' : prev))
    }, 300)

    const toIdle = window.setTimeout(() => setPhase('idle'), 780)

    return () => {
      window.clearTimeout(toReveal)
      window.clearTimeout(toIdle)
    }
  }, [location.pathname])

  if (phase === 'idle') return null

  return (
    <div className={`page-veil ${phase === 'cover' ? 'is-cover' : 'is-reveal'}`} aria-hidden>
      <div className="page-veil-ember" />
      <p className="page-veil-runes font-heading">RuneDelve</p>
    </div>
  )
}

/** Soft abyss wipe before navigating (Gate → Town) */
export function startAbyssVeil(navigate: () => void, delayMs = 360) {
  window.dispatchEvent(new Event('rdav-veil'))
  window.setTimeout(navigate, delayMs)
}

export default PageTransition
