import { useEffect, useMemo, useRef, useState } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import {
  Send,
  MessageCircle,
  Users,
  Wifi,
  WifiOff,
  Search,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { chatApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { activityTracker } from '../utils/activityTracker'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'

const normalizeSockJsUrl = rawUrl =>
  (rawUrl || 'https://campus-resource-sharing-platform.onrender.com/ws')
    .replace(/^wss:/i, 'https:')
    .replace(/^ws:/i, 'http:')

const wsUrl = normalizeSockJsUrl(import.meta.env.VITE_WS_URL)

function formatMessageTime(time) {
  return time
    ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
}

function formatDateLabel(time) {
  return time ? new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''
}

function MessageBubble({ message, mine }) {
  const time = message.sentAt || message.createdAt
  const timeLabel = formatMessageTime(time)

  return (
    <div className={`flex items-end gap-3 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!mine && <Avatar name={message.senderName || 'U'} size="xs" className="mb-1 flex-shrink-0" />}
      <div className={`flex max-w-[80%] flex-col gap-1 sm:max-w-[68%] ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && message.senderName && <span className="px-1 text-xs font-medium text-muted">{message.senderName}</span>}
        <div
          className={`rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm ring-1 ${
            mine
              ? 'rounded-tr-md bg-primary text-white ring-primary/20'
              : 'rounded-tl-md border-border bg-surface text-foreground ring-border'
          }`}
        >
          {message.productTitle && <p className="mb-1 text-[11px] font-medium opacity-70">re: {message.productTitle}</p>}
          <p className="leading-relaxed">{message.content}</p>
        </div>
        {timeLabel && <span className="px-1 text-[10px] text-muted">{timeLabel}</span>}
      </div>
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const stompRef = useRef(null)
  const selectedUserIdRef = useRef('')
  const messagesEndRef = useRef(null)
  const currentUserId = String(user?.id || '')
  const [onlineUsers, setOnlineUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  const visibleOnlineUsers = useMemo(
    () => onlineUsers.filter(u => String(u.id) !== currentUserId),
    [currentUserId, onlineUsers]
  )

  const selectedUser = useMemo(
    () => visibleOnlineUsers.find(u => String(u.id) === String(selectedUserId)) || null,
    [selectedUserId, visibleOnlineUsers]
  )

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return visibleOnlineUsers
    const q = searchQuery.toLowerCase()
    return visibleOnlineUsers.filter(
      u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    )
  }, [searchQuery, visibleOnlineUsers])

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const selectedA = String(a.id) === String(selectedUserId)
      const selectedB = String(b.id) === String(selectedUserId)
      if (selectedA !== selectedB) return selectedA ? -1 : 1
      return String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''))
    })
  }, [filteredUsers, selectedUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId
  }, [selectedUserId])

  const loadOnline = async () => {
    try {
      const res = await chatApi.online()
      setOnlineUsers(res.data || [])
    } catch {
      // silently fail
    }
  }

  const loadHistory = async otherUserId => {
    if (!otherUserId) return
    try {
      const res = await chatApi.history(otherUserId, { page: 0, size: 50, sort: 'createdAt,asc' })
      setMessages(res.data?.messages || [])
      await chatApi.markRead(otherUserId)
    } catch {
      setMessages([])
    }
  }

  useEffect(() => {
    loadOnline()
    const timer = setInterval(loadOnline, 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!user?.token && !localStorage.getItem('token')) return

    const authToken = localStorage.getItem('token') || user?.token
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${authToken}`,
      },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/user/queue/messages', frame => {
          const message = JSON.parse(frame.body)
          setMessages(prev => {
            const open =
              selectedUserIdRef.current &&
              (String(message.senderId) === String(selectedUserIdRef.current) ||
                String(message.recipientId) === String(selectedUserIdRef.current))
            return open ? [...prev, message] : prev
          })
        })
        client.subscribe('/topic/presence', frame => {
          const payload = JSON.parse(frame.body)
          setOnlineUsers(payload.onlineUsers || [])
        })
        loadOnline()
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    })

    client.activate()
    stompRef.current = client
    return () => {
      client.deactivate()
      stompRef.current = null
    }
  }, [user?.email, user?.token])

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([])
      return
    }

    if (currentUserId && String(selectedUserId) === currentUserId) {
      setMessages([])
      return
    }

    if (selectedUserId) {
      loadHistory(selectedUserId)
      if (window.innerWidth < 768) setShowSidebar(false)
    }
  }, [currentUserId, selectedUserId])

  const send = () => {
    const recipientId = Number(selectedUserId)
    if (!draft.trim() || !selectedUserId || !stompRef.current?.connected) return
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      setError('Select a valid user before sending a message.')
      return
    }
    if (currentUserId && String(recipientId) === currentUserId) {
      setError("You can't send a message to yourself. Pick another user.")
      return
    }
    setError('')
    stompRef.current.publish({
      destination: '/app/chat.send',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || user?.token}`,
      },
      body: JSON.stringify({
        recipientId,
        content: draft.trim(),
      }),
    })
    void activityTracker.chatSent(recipientId, {
      preview: draft.trim().slice(0, 120),
    })
    setDraft('')
  }

  return (
    <div className="surface flex h-[calc(100vh-10rem)] overflow-hidden animate-in rounded-[32px] border border-border shadow-sm">
      <aside
        className={`${
          showSidebar ? 'flex' : 'hidden md:flex'
        } w-full flex-shrink-0 flex-col border-r border-border bg-surface md:w-80 lg:w-96`}
      >
        <div className="border-b border-border px-4 py-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <MessageCircle size={18} className="text-primary" />
                Messages
              </div>
              <p className="text-xs text-muted">Direct conversations with campus users</p>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${connected ? 'bg-success-soft text-success' : 'bg-surface-elevated text-muted'}`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : 'Offline'}
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl py-3 pl-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
            <Users size={11} />
            Online ({filteredUsers.length})
          </p>
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No conversations"
              description="People will appear here when they come online."
            />
          ) : (
            <div className="space-y-1">
              {sortedUsers.map(person => {
                const isSelected = String(person.id) === String(selectedUserId)
                const preview = person.lastMessage || person.preview || person.lastMessageText || ''
                const unreadCount = Number(person.unreadCount || person.unreadMessages || 0)
                const lastSeen = person.lastMessageAt || person.updatedAt || person.createdAt

                return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    setError('')
                    setSelectedUserId(String(person.id))
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-primary-soft ring-1 ring-primary/10'
                      : 'hover:bg-surface-elevated'
                  }`}
                >
                  <div className="relative">
                    <Avatar name={person.name || person.email} size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {person.name}
                      </p>
                      {!!unreadCount && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted">{person.email}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                      <span className="truncate">{preview || 'Online now'}</span>
                      {lastSeen && <span>-</span>}
                      {lastSeen && <span>{formatDateLabel(lastSeen)}</span>}
                    </div>
                  </div>
                  {isSelected && <ChevronRight size={14} className="flex-shrink-0 text-primary" />}
                </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted">Chat by User ID</p>
          <input
            className="w-full rounded-2xl py-2.5 text-sm"
            value={selectedUserId}
            onChange={e => {
              setError('')
              setSelectedUserId(e.target.value)
            }}
            placeholder="Enter user ID..."
          />
        </div>
      </aside>

      <div className={`${showSidebar ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5">
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            className="btn-ghost rounded-xl p-1.5 md:hidden"
          >
            <ArrowLeft size={18} />
          </button>

          {selectedUser ? (
            <>
              <div className="relative">
                <Avatar name={selectedUser.name} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedUser.name}
                </h3>
                <p className="text-xs text-success">Online</p>
              </div>
            </>
          ) : selectedUserId ? (
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                User #{selectedUserId}
              </h3>
              <p className="text-xs text-muted">Direct message</p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Select a conversation
              </h3>
              <p className="text-xs text-muted">Pick someone from the sidebar</p>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgb(var(--color-surface))_0%,rgb(var(--color-surface-elevated))_100%)] px-4 py-4">
          {!selectedUserId ? (
            <EmptyState
              icon={MessageCircle}
              title="No conversation selected"
              description="Pick a user from the list to start chatting."
            />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Start the conversation by sending a message below."
            />
          ) : (
            messages.map(msg => (
              <MessageBubble
                key={msg.id || `${msg.senderId}-${msg.sentAt || msg.createdAt}`}
                message={msg}
                mine={String(msg.senderId) === String(user?.id)}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-surface px-4 py-3">
          {error && (
            <div className="mb-3 rounded-2xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-[48px] max-h-32 flex-1 resize-none rounded-2xl py-3 text-sm shadow-sm"
              value={draft}
              onChange={e => {
                setError('')
                setDraft(e.target.value)
              }}
              placeholder={selectedUserId ? 'Type a message...' : 'Select a user first'}
              disabled={!selectedUserId}
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <button
              type="button"
              className="btn h-[48px] w-[48px] flex-shrink-0 rounded-2xl p-0 shadow-sm"
              onClick={send}
              disabled={!selectedUserId || !draft.trim()}
              title="Send (Enter)"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-muted">
            Press Enter to send - Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
