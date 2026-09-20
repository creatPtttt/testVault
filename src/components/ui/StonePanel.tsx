/**
 * StonePanel — Kenney CC0 dark panel chrome (9-slice), carved fantasy plate.
 */

import type { HTMLAttributes, ReactNode } from 'react'

export interface StonePanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  /** Prefer ornate Kenney panel chrome */
  ornate?: boolean
}

export function StonePanel({
  children,
  className = '',
  ornate = true,
  ...rest
}: StonePanelProps) {
  const classes = [
    ornate ? 'game-panel' : 'bg-granite shadow-carved border-2 border-antique-gold/40',
    'p-5',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}

export default StonePanel
