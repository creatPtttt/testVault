/**
 * RuneButton — Flare CC0 dark-fantasy bars (hero) + Dragon Regalia (compact).
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type RuneButtonGlow = 'runeflame' | 'amethyst'
export type RuneButtonVariant = 'default' | 'hero' | 'compact'

export interface RuneButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  glow?: RuneButtonGlow
  variant?: RuneButtonVariant
  className?: string
}

export function RuneButton({
  children,
  glow = 'runeflame',
  variant = 'default',
  className = '',
  disabled,
  type = 'button',
  ...rest
}: RuneButtonProps) {
  const tone = glow === 'amethyst' ? 'rune-btn--amethyst' : 'rune-btn--flame'
  const size =
    variant === 'hero' ? 'rune-btn--hero' : variant === 'compact' ? 'rune-btn--compact' : ''

  return (
    <button
      type={type}
      className={['rune-btn', tone, size, className].filter(Boolean).join(' ')}
      disabled={disabled}
      {...rest}
    >
      <span className="rune-btn-label">{children}</span>
    </button>
  )
}

export default RuneButton
