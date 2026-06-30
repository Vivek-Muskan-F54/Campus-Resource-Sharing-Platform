import { Bell, Check, Package, MessageCircle, ShieldCheck, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'

const typeIcon = {
  MESSAGE: MessageCircle,
  ORDER: Package,
  VERIFICATION: ShieldCheck,
  SYSTEM: Info,
}

const typeColor = {
  MESSAGE: 'text-info',
  ORDER: 'text-success',
  VERIFICATION: 'text-primary',
  SYSTEM: 'text-muted',
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { notifications, unreadCount, loading, loadNotifications, markRead } = useNotifications()

  useEffect(() => {
    if (open) loadNotifications()
  }, [open, loadNotifications])

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative rounded-2xl border border-border bg-surface/80 p-2.5 text-muted shadow-sm backdrop-blur hover:border-border-strong hover:bg-surface hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="modal-surface absolute right-0 top-full z-50 mt-2 w-[calc(100vw-1rem)] max-w-80 animate-slide-up overflow-hidden sm:w-80">
          <div className="flex items-center justify-between border-b border-border bg-surface-elevated/70 px-4 py-3">
            <h3 className="font-semibold tracking-tight text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="badge-red text-xs">{unreadCount} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="skeleton h-4 w-3/4 mx-auto rounded-lg mb-2" />
                <div className="skeleton h-4 w-1/2 mx-auto rounded-lg" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-muted">
                  <Bell size={24} />
                </div>
                <p className="text-sm text-muted">You're all caught up.</p>
              </div>
            ) : (
              notifications.map(notif => {
                const Icon = typeIcon[notif.type] || Info
                const color = typeColor[notif.type] || 'text-muted'
                return (
                  <button
                    key={notif.id}
                    type="button"
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-elevated transition-colors ${
                      !notif.readFlag ? 'bg-primary-soft/40' : ''
                    }`}
                    onClick={() => {
                      if (!notif.readFlag) markRead(notif.id)
                    }}
                  >
                    <div className={`mt-0.5 flex-shrink-0 rounded-xl bg-surface p-2 shadow-sm ring-1 ring-border ${color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2 text-sm leading-6 text-foreground">
                        {notif.message}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!notif.readFlag && <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
