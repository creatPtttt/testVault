/**
 * ItemSlot — 64×64 Diablo/WoW-style inventory cell.
 * Dark inset well with antique-gold trim on hover.
 */

import type { HTMLAttributes, ReactNode } from 'react'
import { Package } from 'lucide-react'

/** Props for a single inventory / equipment slot */
export interface ItemSlotProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional icon or item preview rendered inside the slot */
  children?: ReactNode
  /** When true, shows a faint empty-state placeholder icon */
  empty?: boolean
  /** Accessible label for screen readers */
  label?: string
  /** Optional extra Tailwind classes */
  className?: string
}

/**
 * Square equipment slot with inset shadow and gold hover trim.
 */
export function ItemSlot({
  children,
  empty = false,
  label = 'Item slot',
  className = '',
  ...rest
}: ItemSlotProps) {
  // Compose fixed-size slot chrome
  const classes = [
    // Exact 64×64 inventory cell
    'w-16 h-16',
    // Center whatever is placed inside (icon / sprite)
    'flex items-center justify-center',
    // Deep well background
    'bg-obsidian',
    // Default muted border
    'border-2 border-granite',
    // Gold trim on hover (classic bag highlight)
    'hover:border-antique-gold',
    // Dark inset shadow so the cell feels recessed
    'shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]',
    // Squared pixel edges
    'rounded-none',
    // Crisp cursor feedback
    'cursor-pointer transition-colors duration-150',
    // Keep pixel children sharp
    'pixelated',
    // Caller extensions
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Inventory cell root
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className={classes}
      {...rest}
    >
      {/* Prefer explicit children; otherwise show empty placeholder */}
      {children ??
        (empty ? (
          // Lucide placeholder kept small and crisp for empty wells
          <Package
            className="w-6 h-6 text-granite opacity-60"
            strokeWidth={1.5}
            aria-hidden
          />
        ) : null)}
    </div>
  )
}

export default ItemSlot
