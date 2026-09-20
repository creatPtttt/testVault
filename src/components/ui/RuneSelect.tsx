/**
 * RuneSelect — parchment-bar custom dropdown (no native OS select chrome).
 */

import { useEffect, useId, useRef, useState } from 'react'

export interface RuneSelectOption<T extends string> {
  value: T
  label: string
}

export interface RuneSelectProps<T extends string> {
  label: string
  value: T
  options: RuneSelectOption<T>[]
  onChange: (value: T) => void
}

export function RuneSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: RuneSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="rune-select muster-ledger-field font-body" ref={rootRef}>
      <span className="rune-select-label">{label}</span>
      <button
        type="button"
        className={`rune-select-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rune-select-value">{selected?.label ?? ''}</span>
        <span className="rune-select-caret" aria-hidden />
      </button>
      {open && (
        <ul id={listId} className="rune-select-menu" role="listbox">
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={`rune-select-option ${opt.value === value ? 'is-active' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default RuneSelect
