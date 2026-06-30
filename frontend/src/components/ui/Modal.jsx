import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const titleId = useId()
  const modalRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.body.style.overflow = 'hidden'
      window.requestAnimationFrame(() => {
        modalRef.current?.focus()
      })
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      restoreFocusRef.current?.focus?.()
      restoreFocusRef.current = null
    }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center p-0 animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[rgb(var(--color-overlay)/0.64)] backdrop-blur-md" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-surface relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none animate-slide-up sm:h-auto sm:max-h-[calc(100dvh-2rem)] ${sizes[size] || sizes.md} sm:rounded-[28px]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-between border-b border-border bg-surface-elevated/70 px-4 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-muted hover:bg-surface hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  )
}
