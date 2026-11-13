
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

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null

      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus()
      }, 20)

      return () => clearTimeout(timer)
    } else if (triggerElementRef.current) {
      triggerElementRef.current.focus()
      triggerElementRef.current = null
    }
  }, [isOpen])

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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#171717] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.7)] animate-scaleUp"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#242424]">
          <span className="text-lg text-[#c5ad88]">!</span>
        </div>

        <h3 id={titleId} className="text-base font-semibold tracking-tight text-white sm:text-lg">
          {title}
        </h3>

        {description && (
          <p id={descId} className="mt-2 text-sm leading-6 text-[#888]">
            {description}
          </p>
        )}

        <div className="mt-7 flex items-center justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 bg-[#242424] px-4 py-2 text-xs font-semibold text-[#ddd] transition hover:bg-[#303030] focus:outline-none focus:ring-2 focus:ring-white/15"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 ${
              isDestructive
                ? 'bg-rose-700 text-white hover:bg-rose-600 focus:ring-rose-500/30'
                : 'bg-[#d0b58c] text-[#17120b] hover:bg-[#dfc49b] focus:ring-amber-400/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
