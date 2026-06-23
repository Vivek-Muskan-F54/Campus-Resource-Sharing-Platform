import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[rgb(var(--color-overlay)/0.64)] backdrop-blur-md" />
      <div
        className={`modal-surface relative w-full ${sizes[size] || sizes.md} animate-slide-up`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-elevated/70 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted hover:bg-surface hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
