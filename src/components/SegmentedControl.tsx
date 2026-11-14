import React, { useRef } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: React.ReactNode
  /** Accessible name for screen readers (also used as the tooltip). */
  ariaLabel: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
}

/**
 * Small radio-group style switch. Follows the ARIA radiogroup pattern:
 * only the selected option is in the tab order, and the arrow keys move the
 * selection. Each option keeps a 44px minimum touch target.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = -1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length
    if (next === -1) return
    event.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-raised p-0.5"
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            title={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] px-3 text-xs font-semibold transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-line-2 ${
              selected
                ? 'bg-fill-2 text-fg shadow-[inset_0_0_0_1px_var(--line-2)]'
                : 'text-fg-3 hover:bg-fill hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}