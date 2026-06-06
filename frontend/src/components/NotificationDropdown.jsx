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
  MESSAGE: 'text-blue-500',
  ORDER: 'text-emerald-500',
  VERIFICATION: 'text-brand-500',
  SYSTEM: 'text-slate-500',
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
        className="relative rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 animate-slide-up overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
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
                <Bell size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-400 dark:text-slate-500">You're all caught up!</p>
              </div>
            ) : (
              notifications.map(notif => {
                const Icon = typeIcon[notif.type] || Info
                const color = typeColor[notif.type] || 'text-slate-500'
                return (
                  <button
                    key={notif.id}
                    type="button"
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      !notif.readFlag ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                    }`}
                    onClick={() => {
                      if (!notif.readFlag) markRead(notif.id)
                    }}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!notif.readFlag && (
                      <div className="mt-1 h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />
                    )}
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
