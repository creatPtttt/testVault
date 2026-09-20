/**
 * RenameModal — in-game rename dialog (NO native window.prompt).
 */

import { useEffect, useRef, useState } from 'react'
import { RENAME_COST } from '../../config/gameConfig'
import { RuneButton } from './RuneButton'
import { StonePanel } from './StonePanel'

/** Props for the rename dialog */
export interface RenameModalProps {
  /** Current delver display name */
  currentName: string
  /** Player $RDAV balance for affordance messaging */
  rdavBalance: number
  /** Called with trimmed name when player confirms */
  onConfirm: (newName: string) => boolean | Promise<boolean>
  /** Dismiss without renaming */
  onClose: () => void
}

/**
 * Centered StonePanel rename form over a blurred backdrop.
 */
export function RenameModal({
  currentName,
  rdavBalance,
  onConfirm,
  onClose,
}: RenameModalProps) {
  // Controlled input seeded with the current name
  const [name, setName] = useState(currentName)
  // Inline error — never use window.alert
  const [error, setError] = useState<string | null>(null)
  // Autofocus the field when the modal opens
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Escape closes without saving
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canAfford = rdavBalance >= RENAME_COST

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a valid name.')
      return
    }
    if (!canAfford) {
      setError(`Need ${RENAME_COST.toLocaleString('en-US')} $RDAV to rename.`)
      return
    }
    void Promise.resolve(onConfirm(trimmed)).then((ok) => {
      if (!ok) {
        setError(`Rename failed. Need ${RENAME_COST.toLocaleString('en-US')} $RDAV and a valid name.`)
        return
      }
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md modal-backdrop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-modal-title"
      onClick={onClose}
    >
      <div className="fade-rise-in w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <StonePanel className="border-[3px] border-antique-gold p-6 shadow-[0_0_40px_rgba(184,134,11,0.4),inset_0_0_24px_rgba(0,0,0,0.7)]">
          <h2
            id="rename-modal-title"
            className="font-heading text-2xl text-antique-gold drop-shadow-[0_0_10px_rgba(184,134,11,0.5)]"
          >
            Rename Delver
          </h2>

          <p className="mt-2 font-body text-sm text-white/70">
            Carve a new name into the blood contract. Cost:{' '}
            <span className="font-pixel text-runeflame">
              {RENAME_COST.toLocaleString('en-US')}
            </span>{' '}
            <span className="font-body text-runeflame">$RDAV</span>
          </p>

          <label className="mt-5 block font-body text-xs uppercase tracking-wide text-antique-gold/80">
            New Name
            <input
              ref={inputRef}
              className="rune-input mt-2"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              maxLength={32}
              placeholder="Enter delver name…"
              aria-invalid={Boolean(error)}
            />
          </label>

          {error && (
            <p className="mt-3 font-body text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <p className="mt-3 font-body text-xs text-white/45">
            Balance:{' '}
            <span className="font-pixel text-runeflame">
              {rdavBalance.toLocaleString('en-US')}
            </span>{' '}
            $RDAV
          </p>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <RuneButton type="button" glow="amethyst" onClick={onClose}>
              Cancel
            </RuneButton>
            <RuneButton type="button" glow="runeflame" onClick={submit} disabled={!canAfford}>
              Confirm Rename
            </RuneButton>
          </div>
        </StonePanel>
      </div>
    </div>
  )
}

export default RenameModal
