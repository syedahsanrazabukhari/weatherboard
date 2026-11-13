import React, { useEffect, useId, useRef } from 'react'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Remove',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId()
  const descId = useId()

  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)

  // Focus management: store previous focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null

      // Move focus into the dialog (defaulting to Cancel for safety)
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus()
      }, 20)

      return () => clearTimeout(timer)
    } else if (triggerElementRef.current) {
      triggerElementRef.current.focus()
      triggerElementRef.current = null
    }
  }, [isOpen])

  // Keyboard navigation: Escape key and Tab focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )

        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl transition-all animate-scaleUp"
      >
        <h3 id={titleId} className="text-base font-semibold text-slate-100 sm:text-lg">
          {title}
        </h3>

        {description && (
          <p id={descId} className="mt-2 text-xs text-slate-400 sm:text-sm">
            {description}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] min-w-[70px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-750 active:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex min-h-[44px] min-w-[70px] items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white transition-colors focus:outline-none focus:ring-2 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 focus:ring-rose-500/30'
                : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 focus:ring-cyan-500/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
