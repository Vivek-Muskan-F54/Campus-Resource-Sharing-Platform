import { useEffect, useMemo, useRef, useState } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import {
  Send, MessageCircle, Users, Wifi, WifiOff, Search,
  ArrowLeft, ChevronRight
} from 'lucide-react'
import { chatApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'

const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'

function MessageBubble({ message, mine }) {
  const time = message.sentAt || message.createdAt
  const timeLabel = time
    ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!mine && (
        <Avatar name={message.senderName || 'U'} size="xs" className="flex-shrink-0 mb-1" />
      )}
      <div className={`max-w-[75%] sm:max-w-[65%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!mine && message.senderName && (
          <span className="text-xs text-slate-500 dark:text-slate-400 px-1">{message.senderName}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            mine
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
          }`}
        >
          {message.productTitle && (
            <p className={`text-xs mb-1 opacity-70`}>re: {message.productTitle}</p>
          )}
          <p className="leading-relaxed">{message.content}</p>
        </div>
        {timeLabel && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">{timeLabel}</span>
        )}
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

  // Auto-scroll on new messages
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

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('token') || user?.token}`,
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
    return () => { client.deactivate(); stompRef.current = null }
  }, [user?.email])

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
    setDraft('')
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card animate-in">
      {/* ─── Sidebar ─────────────────────────────────── */}
      <aside
        className={`${
          showSidebar ? 'flex' : 'hidden md:flex'
        } w-full md:w-72 lg:w-80 flex-col border-r border-slate-200 dark:border-slate-800 flex-shrink-0`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageCircle size={18} className="text-brand-600 dark:text-brand-400" />
              Messages
            </h2>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${connected ? 'text-emerald-500' : 'text-slate-400'}`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : 'Offline'}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 py-2 text-sm"
            />
          </div>
        </div>

        {/* Online users list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1.5">
              <Users size={11} />
              Online ({filteredUsers.length})
            </p>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-400 dark:text-slate-500">No one online right now</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredUsers.map(person => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      setError('')
                      setSelectedUserId(String(person.id))
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      String(person.id) === String(selectedUserId)
                        ? 'bg-brand-50 dark:bg-brand-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="relative">
                      <Avatar name={person.name || person.email} size="sm" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        String(person.id) === String(selectedUserId)
                          ? 'text-brand-700 dark:text-brand-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {person.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{person.email}</p>
                    </div>
                    {String(person.id) === String(selectedUserId) && (
                      <ChevronRight size={14} className="text-brand-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual user ID */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Chat by User ID</p>
          <input
            className="w-full text-sm py-2"
            value={selectedUserId}
            onChange={e => {
              setError('')
              setSelectedUserId(e.target.value)
            }}
            placeholder="Enter user ID..."
          />
        </div>
      </aside>

      {/* ─── Chat Window ─────────────────────────────── */}
      <div className={`${showSidebar ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            className="md:hidden btn-ghost p-1.5 rounded-lg"
          >
            <ArrowLeft size={18} />
          </button>

          {selectedUser ? (
            <>
              <div className="relative">
                <Avatar name={selectedUser.name} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{selectedUser.name}</h3>
                <p className="text-xs text-emerald-500">Online</p>
              </div>
            </>
          ) : selectedUserId ? (
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">User #{selectedUserId}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Direct message</p>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Select a conversation</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Pick someone from the sidebar</p>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!selectedUserId ? (
            <EmptyState
              icon={MessageCircle}
              title="No conversation selected"
              description="Pick a user from the list to start chatting"
            />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Start the conversation by sending a message below!"
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

        {/* Message input */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 min-h-[42px] max-h-24 resize-none py-2.5 text-sm rounded-xl"
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
              className="btn h-[42px] w-[42px] p-0 flex-shrink-0"
              onClick={send}
              disabled={!selectedUserId || !draft.trim()}
              title="Send (Enter)"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 px-1">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
