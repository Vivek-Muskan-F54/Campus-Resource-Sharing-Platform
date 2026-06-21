import { useCallback, useEffect, useState } from 'react'
import { notificationApi } from '../api/services'
import { useAuth } from '../context/AuthContext'

export function useNotifications() {
  const { user, ready } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadUnreadCount = useCallback(async () => {
    if (!user || !ready) return
    try {
      const res = await notificationApi.unreadCount()
      setUnreadCount(res.data?.count ?? 0)
    } catch {
      // silently fail
    }
  }, [ready, user])

  const loadNotifications = useCallback(async () => {
    if (!user || !ready) return
    setLoading(true)
    try {
      const res = await notificationApi.all({ page: 0, size: 20 })
      setNotifications(res.data?.content || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [ready, user])

  const markRead = useCallback(async id => {
    try {
      await notificationApi.markRead(id)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readFlag: true } : n))
      )
      setUnreadCount(c => Math.max(0, c - 1))
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [loadUnreadCount, ready])

  return { notifications, unreadCount, loading, loadNotifications, markRead, loadUnreadCount }
}
