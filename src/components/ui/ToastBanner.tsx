/**
 * ToastBanner — in-game notice banner (NO native window.alert).
 */

import { useEffect } from 'react'
import { X } from 'lucide-react'

/** Props for a floating status toast */
export interface ToastBannerProps {
  /** Message body */
  message: string
  /** Visual tone */
  tone?: 'error' | 'info' | 'success'
  /** Dismiss callback */
  onClose: () => void
  /** Auto-dismiss after ms (default 4200) */
  durationMs?: number
}

/**
 * Fixed top-center toast with dark fantasy chrome.
 */
export function ToastBanner({
  message,
  tone = 'error',
  onClose,
  durationMs = 4200,
}: ToastBannerProps) {
  // Auto-dismiss after a short delay
  useEffect(() => {
    const id = window.setTimeout(onClose, durationMs)
    return () => window.clearTimeout(id)
  }, [onClose, durationMs])

  const border =
    tone === 'success'
      ? 'border-runeflame text-runeflame'
      : tone === 'info'
        ? 'border-antique-gold text-antique-gold'
        : 'border-red-500 text-red-300'

  return (
    <div
      className={`tooltip-fade fixed left-1/2 top-20 z-[220] flex max-w-md -translate-x-1/2 items-start gap-3 border-2 bg-obsidian/95 px-4 py-3 shadow-[0_0_24px_rgba(0,0,0,0.85)] backdrop-blur-md ${border}`}
      role="status"
    >
      <p className="font-body text-sm leading-snug text-white/90">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-white/50 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default ToastBanner
