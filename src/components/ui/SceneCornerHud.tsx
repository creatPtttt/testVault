/**
 * Bottom-left scene HUD — back path, purse, and optional ledger.
 * Thin obsidian plates instead of the thick stone panel (too heavy for a corner chip).
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function SceneCornerHud({ children }: { children: ReactNode }) {
  return (
    <div className="scene-hud pointer-events-none absolute bottom-4 left-4 z-30 flex flex-col gap-2 md:bottom-6 md:left-6">
      {children}
    </div>
  )
}

export function SceneHudBack({ to = '/town', label = 'Sanctum Overlook' }: { to?: string; label?: string }) {
  return (
    <Link to={to} className="scene-hud-plate scene-hud-back pointer-events-auto">
      <span className="scene-hud-back-mark" aria-hidden>
        ←
      </span>
      <span className="font-heading text-sm tracking-wide text-[#e8c878]">{label}</span>
    </Link>
  )
}

export function SceneHudPurse({
  label = 'Treasury',
  balance,
  footer,
}: {
  label?: string
  balance: number
  footer?: ReactNode
}) {
  return (
    <div className="scene-hud-plate scene-hud-purse pointer-events-auto">
      <div className="flex items-center gap-2">
        <img
          src="/assets/expeditions/loot-coins.png?v=1"
          alt=""
          className="scene-hud-coin pixelated"
          draggable={false}
        />
        <div className="min-w-0">
          <p className="font-body text-[10px] uppercase tracking-[0.22em] text-[#c4a35a]/85">{label}</p>
          <p className="font-pixel text-[13px] leading-none text-[#f0d78c]">
            {balance.toLocaleString('en-US')}
            <span className="ml-1 font-body text-[10px] tracking-wide text-[#e8c878]/75">$RDAV</span>
          </p>
        </div>
      </div>
      {footer}
    </div>
  )
}

export function SceneHudAction({
  title,
  detail,
  onClick,
}: {
  title: string
  detail: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" className="scene-hud-plate scene-hud-action pointer-events-auto text-left" onClick={onClick}>
      <span className="block font-heading text-sm text-[#e8c878]">{title}</span>
      <span className="mt-0.5 block font-body text-[10px] text-white/55 leading-none">{detail}</span>
    </button>
  )
}
