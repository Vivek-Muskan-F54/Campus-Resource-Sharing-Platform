import { useEffect, useMemo, useRef, useState } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import {
  ArrowLeft,
  Clock3,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { chatApi } from '../api/services'
import { WS_BASE_URL } from '../config/environment'
import { useAuth } from '../context/AuthContext'
import { activityTracker } from '../utils/activityTracker'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'

const normalizeSockJsUrl = rawUrl =>
  (rawUrl || WS_BASE_URL)
    .replace(/^wss:/i, 'https:')
    .replace(/^ws:/i, 'http:')

const wsUrl = normalizeSockJsUrl(WS_BASE_URL)

function formatMessageTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatConversationTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const diffDays = Math.round((now - date) / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatRelativeStatus(time) {
  if (!time) return ''
  const diff = Date.now() - new Date(time).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function truncate(value, maxLength = 64) {
  const text = String(value || '').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}...`
}

function buildSignature(message) {
  return [
    message.senderId,
    message.recipientId,
    message.productId ?? '',
    message.content ?? '',
  ].join('|')
}

function compareMessageTimes(left, right) {
  return new Date(right.lastMessageAt || 0).getTime() - new Date(left.lastMessageAt || 0).getTime()
}

function mergeConversationSnapshots(previous, incoming) {
  const merged = new Map(previous.map(item => [String(item.otherUserId), item]))

  for (const item of incoming) {
    const key = String(item.otherUserId)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, item)
      continue
    }

    const existingTime = new Date(existing.lastMessageAt || 0).getTime()
    const incomingTime = new Date(item.lastMessageAt || 0).getTime()
    const newer = incomingTime >= existingTime ? item : existing
    const older = incomingTime >= existingTime ? existing : item

    merged.set(key, {
      ...older,
      ...newer,
      unreadCount: Math.max(Number(existing.unreadCount || 0), Number(item.unreadCount || 0)),
      online: Boolean(existing.online || item.online),
    })
  }

  return [...merged.values()].sort(compareMessageTimes)
}

function messageKey(message) {
  return [
    message.id ?? '',
    message.senderId ?? '',
    message.recipientId ?? '',
    message.productId ?? '',
    message.content ?? '',
    message.sentAt ?? message.createdAt ?? '',
  ].join('|')
}

function messageTimeValue(message) {
  return new Date(message.sentAt || message.createdAt || 0).getTime()
}

function mergeMessageLists(previous, incoming) {
  const merged = new Map()
  for (const message of [...previous, ...incoming]) {
    merged.set(messageKey(message), message)
  }
  return [...merged.values()].sort((left, right) => messageTimeValue(left) - messageTimeValue(right))
}

function Bubble({ message, mine }) {
  const time = message.sentAt || message.createdAt
  const label = formatMessageTime(time)

  return (
    <div className={`flex items-end gap-2 sm:gap-3 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!mine && (
        <Avatar
          name={message.senderName || 'U'}
          size="xs"
          className="mb-1 hidden flex-shrink-0 sm:flex"
        />
      )}
      <div className={`flex max-w-[82%] flex-col gap-1 sm:max-w-[72%] lg:max-w-[64%] ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && message.senderName && (
          <span className="px-1 text-[11px] font-medium text-muted sm:text-xs">
            {message.senderName}
          </span>
        )}
        <div
          className={`whitespace-pre-wrap break-words rounded-[26px] px-4 py-3 text-sm leading-6 shadow-sm ring-1 ${
            mine
              ? 'rounded-tr-md bg-primary text-white ring-primary/20'
              : 'rounded-tl-md border-border bg-surface text-foreground ring-border'
          }`}
        >
          {message.productTitle && (
            <p className="mb-1 text-[11px] font-medium opacity-70">re: {message.productTitle}</p>
          )}
          <p className="leading-relaxed">{message.content}</p>
        </div>
        <div className={`flex items-center gap-1 px-1 text-[10px] ${mine ? 'text-right' : 'text-left'} text-muted`}>
          <Clock3 size={10} />
          <span>{label}</span>
          {message.readFlag && mine && <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-success">Read</span>}
        </div>
      </div>
    </div>
  )
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-[22px] border border-border bg-surface p-3 animate-pulse"
        >
          <div className="h-11 w-11 rounded-full bg-surface-elevated" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded-full bg-surface-elevated" />
            <div className="h-3 w-3/4 rounded-full bg-surface-elevated" />
          </div>
          <div className="h-4 w-10 rounded-full bg-surface-elevated" />
        </div>
      ))}
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4 sm:px-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className={`flex animate-pulse ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
        >
          <div className="max-w-[72%] rounded-[26px] bg-surface-elevated px-4 py-3">
            <div className="h-3 w-32 rounded-full bg-surface" />
            <div className="mt-2 h-3 w-44 rounded-full bg-surface" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const currentUserId = String(user?.id || '')
  const isLoggedIn = !!(user?.token || localStorage.getItem('token'))
  const stompRef = useRef(null)
  const selectedUserIdRef = useRef('')
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const messageIdsRef = useRef(new Set())
  const pendingEchoRef = useRef(new Map())
  const isAtBottomRef = useRef(true)
  const loadHistoryRequestRef = useRef(0)
  const [connectionState, setConnectionState] = useState(isLoggedIn ? 'connecting' : 'disconnected')
  const [onlineUsers, setOnlineUsers] = useState([])
  const [conversationSummaries, setConversationSummaries] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [messageLoading, setMessageLoading] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [newMessagesAvailable, setNewMessagesAvailable] = useState(false)

  const selectedConversationId = String(selectedUserId || activeConversation?.otherUserId || '')

  const conversationMap = useMemo(
    () => new Map(conversationSummaries.map(item => [String(item.otherUserId), item])),
    [conversationSummaries]
  )

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null
    return (
      conversationMap.get(selectedConversationId) ||
      activeConversation ||
      onlineUsers.find(userItem => String(userItem.id) === selectedConversationId) ||
      null
    )
  }, [activeConversation, conversationMap, onlineUsers, selectedConversationId])

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return conversationSummaries
    return conversationSummaries.filter(item => {
      const haystack = [
        item.otherUserName,
        item.otherUserEmail,
        item.lastMessage,
        item.productTitle,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [conversationSummaries, searchQuery])

  const onlineStartables = useMemo(() => {
    const conversationIds = new Set(conversationSummaries.map(item => String(item.otherUserId)))
    return onlineUsers.filter(userItem => !conversationIds.has(String(userItem.id)))
  }, [conversationSummaries, onlineUsers])

  const filteredOnlineStartables = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return onlineStartables
    return onlineStartables.filter(userItem => {
      const haystack = `${userItem.name || ''} ${userItem.email || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [onlineStartables, searchQuery])

  const visibleConversationList = filteredConversations

  const updateConversationSummary = (message, { markUnread = false } = {}) => {
    const otherUserId = String(message.senderId) === currentUserId
      ? message.recipientId
      : message.senderId
    const conversationMatch = conversationMap.get(String(otherUserId))
    const onlineMatch = onlineUsers.find(u => String(u.id) === String(otherUserId))
    const activeMatch =
      activeConversation && String(activeConversation.otherUserId || activeConversation.id) === String(otherUserId)
        ? activeConversation
        : null
    const otherUser = conversationMatch || onlineMatch || activeMatch

    setConversationSummaries(prev => {
      const nextItem = {
        otherUserId,
        otherUserEmail:
          otherUser?.otherUserEmail ||
          otherUser?.email ||
          message.senderEmail ||
          message.recipientEmail ||
          '',
        otherUserName:
          otherUser?.otherUserName ||
          otherUser?.name ||
          (String(message.senderId) === currentUserId ? message.recipientName : message.senderName) ||
          `User ${otherUserId}`,
        lastSenderId: message.senderId,
        lastMessage: message.content || message.productTitle || 'Attachment',
        productId: message.productId ?? null,
        productTitle: message.productTitle ?? null,
        online: otherUser?.online ?? onlineUsers.some(u => String(u.id) === String(otherUserId)),
        unreadCount: markUnread ? ((prev.find(item => String(item.otherUserId) === String(otherUserId))?.unreadCount || 0) + 1) : 0,
        lastMessageAt: message.sentAt || message.createdAt || new Date().toISOString(),
      }

      const filtered = prev.filter(item => String(item.otherUserId) !== String(otherUserId))
      return [nextItem, ...filtered].sort(
        (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
      )
    })
  }

  const scrollToBottom = (behavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior })
      isAtBottomRef.current = true
      setNewMessagesAvailable(false)
    })
  }

  const loadConversations = async () => {
    if (!isLoggedIn) {
      setConversationSummaries([])
      setConversationsLoading(false)
      setError('')
      return
    }

    setConversationsLoading(true)
    try {
      const [conversationResponse, presenceResponse] = await Promise.allSettled([
        chatApi.conversations(),
        chatApi.online(),
      ])
      const list =
        conversationResponse.status === 'fulfilled' && Array.isArray(conversationResponse.value.data)
          ? conversationResponse.value.data
          : []
      const onlineList =
        presenceResponse.status === 'fulfilled' && Array.isArray(presenceResponse.value.data)
          ? presenceResponse.value.data
          : []
      setOnlineUsers(onlineList)
      setConversationSummaries(prev => mergeConversationSnapshots(prev, list))
      setError('')
    } catch {
      setConversationSummaries([])
      setOnlineUsers([])
      setError('Could not load conversations right now. You can retry in a moment.')
    } finally {
      setConversationsLoading(false)
    }
  }

  const loadHistory = async otherUserId => {
    if (!otherUserId) return
    const requestId = ++loadHistoryRequestRef.current
    setMessageLoading(true)
    try {
      const response = await chatApi.history(otherUserId, { page: 0, size: 50, sort: 'createdAt,asc' })
      if (requestId !== loadHistoryRequestRef.current) return
      const conversation = response.data || {}
      setActiveConversation({
        otherUserId: conversation.otherUserId,
        otherUserName: conversation.otherUserName,
      })
      const incomingMessages = Array.isArray(conversation.messages) ? conversation.messages : []
      setMessages(prev => {
        const merged = mergeMessageLists(prev, incomingMessages)
        messageIdsRef.current = new Set(merged.map(message => String(message.id)).filter(Boolean))
        return merged
      })
      pendingEchoRef.current.clear()
      setNewMessagesAvailable(false)
      isAtBottomRef.current = true
      await chatApi.markRead(otherUserId)
      setConversationSummaries(prev =>
        prev.map(item =>
          String(item.otherUserId) === String(otherUserId)
            ? { ...item, unreadCount: 0 }
            : item
        )
      )
      scrollToBottom('auto')
    } catch {
      if (requestId === loadHistoryRequestRef.current) {
        setMessages([])
        messageIdsRef.current = new Set()
        pendingEchoRef.current.clear()
      }
    } finally {
      if (requestId === loadHistoryRequestRef.current) {
        setMessageLoading(false)
      }
    }
  }

  const openConversation = otherUserId => {
    const summary = conversationMap.get(String(otherUserId))
    const userInfo = summary || onlineUsers.find(item => String(item.id) === String(otherUserId))
    setError('')
    setSelectedUserId(String(otherUserId))
    setActiveConversation(
      userInfo
        ? {
            otherUserId: userInfo.otherUserId || userInfo.id,
            otherUserName: userInfo.otherUserName || userInfo.name,
          }
        : { otherUserId, otherUserName: `User ${otherUserId}` }
    )
    setShowConversationList(false)
  }

  const upsertIncomingMessage = message => {
    if (!message) return

    const signature = buildSignature(message)
    const pendingTempId = pendingEchoRef.current.get(signature)
    const shouldScroll = String(message.senderId) === currentUserId || isAtBottomRef.current
    const partnerId = String(message.senderId) === currentUserId ? String(message.recipientId) : String(message.senderId)

    if (pendingTempId) {
      pendingEchoRef.current.delete(signature)
      messageIdsRef.current.add(String(message.id))
      setMessages(prev =>
        prev.map(item => (String(item.id) === String(pendingTempId) ? message : item))
      )
      updateConversationSummary(message, { markUnread: false })
      if (shouldScroll) scrollToBottom()
      return
    }

    if (message.id != null && messageIdsRef.current.has(String(message.id))) {
      return
    }

    if (message.id != null) {
      messageIdsRef.current.add(String(message.id))
    }

    setMessages(prev => [...prev, message])
    updateConversationSummary(message, {
      markUnread:
        String(message.recipientId) === currentUserId &&
        String(partnerId) !== selectedConversationId,
    })

    if (String(partnerId) === selectedConversationId) {
      if (shouldScroll) {
        scrollToBottom()
      } else {
        setNewMessagesAvailable(true)
      }
      void chatApi.markRead(partnerId)
    }
  }

  useEffect(() => {
    selectedUserIdRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    if (!messagesContainerRef.current) return
    const el = messagesContainerRef.current

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const atBottom = distanceFromBottom < 80
      isAtBottomRef.current = atBottom
      if (atBottom) {
        setNewMessagesAvailable(false)
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [selectedConversationId, messages.length])

  useEffect(() => {
    if (!draft) return
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`
  }, [draft])

  useEffect(() => {
    if (!isLoggedIn) {
      setConnectionState('disconnected')
      setOnlineUsers([])
      setConversationSummaries([])
      return
    }

    setConnectionState('connecting')
    const authToken = localStorage.getItem('token') || user?.token
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${authToken}`,
      },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnectionState('connected')
        void loadConversations()
        client.subscribe('/user/queue/messages', frame => {
          const message = JSON.parse(frame.body)
          const activeConversationId = selectedUserIdRef.current
          const openConversation =
            activeConversationId &&
            (String(message.senderId) === String(activeConversationId) ||
              String(message.recipientId) === String(activeConversationId))
          if (openConversation) {
            upsertIncomingMessage(message)
          } else {
            updateConversationSummary(message, { markUnread: String(message.recipientId) === currentUserId })
          }
        })
        client.subscribe('/topic/presence', frame => {
          const payload = JSON.parse(frame.body)
          const users = payload.onlineUsers || []
          setOnlineUsers(users)
          setConversationSummaries(prev =>
            prev.map(item => ({
              ...item,
              online: users.some(userItem => String(userItem.id) === String(item.otherUserId)),
            }))
          )
        })
      },
      onDisconnect: () => setConnectionState('disconnected'),
      onStompError: () => setConnectionState('disconnected'),
      onWebSocketClose: () => setConnectionState('connecting'),
    })

    client.activate()
    stompRef.current = client
    return () => {
      client.deactivate()
      stompRef.current = null
    }
  }, [currentUserId, isLoggedIn, user?.token])

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      setActiveConversation(null)
      setNewMessagesAvailable(false)
      return
    }

    if (currentUserId && String(selectedConversationId) === currentUserId) {
      setMessages([])
      return
    }

    void loadHistory(selectedConversationId)
  }, [currentUserId, selectedConversationId])

  const send = () => {
    const recipientId = Number(selectedConversationId)
    const content = draft.trim()
    if (!content || !selectedConversationId || !stompRef.current?.connected) return
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      setError('Select a valid user before sending a message.')
      return
    }
    if (currentUserId && String(recipientId) === currentUserId) {
      setError("You can't send a message to yourself. Pick another conversation.")
      return
    }

    setError('')
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticMessage = {
      id: tempId,
      senderId: Number(currentUserId),
      senderName: user?.name || user?.email || 'You',
      recipientId,
      recipientName: selectedConversation?.otherUserName || selectedConversation?.name || `User ${recipientId}`,
      productId: null,
      productTitle: null,
      content,
      readFlag: false,
      readAt: null,
      sentAt: new Date().toISOString(),
    }
    pendingEchoRef.current.set(buildSignature(optimisticMessage), tempId)
    messageIdsRef.current.add(tempId)
    setMessages(prev => [...prev, optimisticMessage])
    updateConversationSummary(optimisticMessage, { markUnread: false })
    scrollToBottom()

    stompRef.current.publish({
      destination: '/app/chat.send',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || user?.token}`,
      },
      body: JSON.stringify({
        recipientId,
        content,
      }),
    })

    void activityTracker.chatSent(recipientId, {
      preview: content.slice(0, 120),
    })
    setDraft('')
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const conversationLabel = selectedConversation?.otherUserName || `User #${selectedConversationId || '-'}`
  const conversationMeta = selectedConversation?.otherUserEmail || (selectedConversation?.online ? 'Online now' : 'Direct message')

  return (
    <div className="surface flex min-h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-[32px] border border-border shadow-sm animate-in">
      <div className="grid min-h-[calc(100vh-10rem)] min-w-0 grid-rows-[1fr_auto] lg:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-1">
        <aside
          className={`${
            showConversationList ? 'flex' : 'hidden'
          } min-h-0 flex-col border-r border-border bg-surface lg:flex`}
        >
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <MessageCircle size={18} className="text-primary" />
                  Messages
                </div>
                <p className="text-xs text-muted">Recent chats, previews, and unread updates</p>
              </div>
              <div
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  connectionState === 'connected'
                    ? 'bg-success-soft text-success'
                    : connectionState === 'connecting'
                      ? 'bg-warning-soft text-warning'
                      : 'bg-surface-elevated text-muted'
                }`}
              >
                {connectionState === 'connected' ? (
                  <Wifi size={12} />
                ) : (
                  <WifiOff size={12} />
                )}
                {connectionState === 'connected'
                  ? 'Connected'
                  : connectionState === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-2xl border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">{error}</span>
                  <button type="button" onClick={() => void loadConversations()} className="btn-secondary shrink-0 px-3 py-1 text-[11px]">
                    Retry
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl py-3 pl-9 text-sm"
                aria-label="Search conversations"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-3 pb-3 pt-3 sm:px-4">
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                <Users size={11} />
                Conversations
              </div>
              {conversationsLoading ? (
                <ConversationSkeleton />
              ) : visibleConversationList.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="No conversations yet"
                  description="Start a conversation with a verified student to see your inbox grow."
                  action={
                    filteredOnlineStartables.length ? (
                      <button
                        type="button"
                        onClick={() => openConversation(filteredOnlineStartables[0].id)}
                        className="btn gap-2"
                      >
                        <Sparkles size={14} />
                        Message someone online
                      </button>
                    ) : null
                  }
                />
              ) : (
                <div className="space-y-1">
                  {visibleConversationList.map(item => {
                    const isActive = String(item.otherUserId) === selectedConversationId
                    const previewPrefix =
                      String(item.lastSenderId) === currentUserId ? 'You: ' : ''

                    return (
                      <button
                        key={item.otherUserId}
                        type="button"
                        onClick={() => openConversation(item.otherUserId)}
                        className={`group flex w-full items-center gap-3 rounded-[24px] px-3 py-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-primary/30 ${
                          isActive
                            ? 'bg-primary-soft ring-1 ring-primary/10'
                            : 'hover:bg-surface-elevated'
                        }`}
                        aria-label={`Open conversation with ${item.otherUserName}`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar name={item.otherUserName || item.otherUserEmail} size="md" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface ${
                              item.online ? 'bg-success' : 'bg-surface-elevated'
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                {item.otherUserName || item.otherUserEmail || `User ${item.otherUserId}`}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {item.otherUserEmail || (item.online ? 'Online now' : 'Message history')}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-muted">
                                {formatConversationTime(item.lastMessageAt)}
                              </span>
                              {!!item.unreadCount && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {item.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-muted">
                              {previewPrefix}
                              {truncate(item.lastMessage || item.productTitle || 'Conversation started', 42)}
                            </p>
                            <ChevronRight
                              size={14}
                              className={`flex-shrink-0 transition-transform ${
                                isActive ? 'translate-x-0 text-primary' : 'text-muted group-hover:translate-x-0.5'
                              }`}
                            />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border px-3 py-3 sm:px-4">
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                <Sparkles size={11} />
                Online now
              </div>
              {filteredOnlineStartables.length ? (
                <div className="space-y-1">
                  {filteredOnlineStartables.slice(0, 6).map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => openConversation(person.id)}
                      className="flex w-full items-center gap-3 rounded-[20px] px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-primary/30"
                      aria-label={`Start chat with ${person.name}`}
                    >
                      <Avatar name={person.name || person.email} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
                        <p className="truncate text-xs text-muted">{person.email}</p>
                      </div>
                      <span className="rounded-full bg-success-soft px-2 py-1 text-[10px] font-semibold text-success">
                        Online
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No one online right now"
                  description="When students connect, they will appear here for quick access."
                />
              )}
            </div>

            <div className="border-t border-border px-4 py-3">
              <p className="mb-2 text-xs font-medium text-muted">Chat by User ID</p>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl py-2.5 text-sm"
                  value={selectedUserId}
                  onChange={e => {
                    setError('')
                    setSelectedUserId(e.target.value)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const nextId = selectedUserId.trim()
                      if (nextId) openConversation(nextId)
                    }
                  }}
                  placeholder="Enter user ID..."
                  aria-label="Chat by user ID"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextId = selectedUserId.trim()
                    if (nextId) openConversation(nextId)
                  }}
                  className="btn-secondary rounded-2xl px-3"
                  aria-label="Open user by ID"
                >
                  Open
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section
          className={`${
            showConversationList ? 'hidden lg:flex' : 'flex'
          } min-h-0 min-w-0 flex-col bg-[linear-gradient(180deg,rgb(var(--color-surface))_0%,rgb(var(--color-surface-elevated))_100%)]`}
        >
          <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5 sm:px-5">
            <button
              type="button"
              onClick={() => setShowConversationList(true)}
              className="btn-ghost rounded-xl p-2 lg:hidden"
              aria-label="Back to conversation list"
            >
              <ArrowLeft size={18} />
            </button>

            {selectedConversation ? (
              <>
                <div className="relative">
                  <Avatar name={selectedConversation.otherUserName || selectedConversation.name || `User ${selectedConversationId}`} size="sm" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface ${
                      selectedConversation.online ? 'bg-success' : 'bg-surface-elevated'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {conversationLabel}
                  </h3>
                  <p className="truncate text-xs text-muted">{conversationMeta}</p>
                </div>
                <div
                  className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:flex ${
                    connectionState === 'connected'
                      ? 'bg-success-soft text-success'
                      : connectionState === 'connecting'
                        ? 'bg-warning-soft text-warning'
                        : 'bg-surface-elevated text-muted'
                  }`}
                >
                  {connectionState === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {connectionState === 'connected'
                    ? 'Connected'
                    : connectionState === 'connecting'
                      ? 'Connecting...'
                      : 'Disconnected'}
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Select a conversation</h3>
                <p className="text-xs text-muted">Choose a chat from the list or start a new one.</p>
              </div>
            )}
          </header>

          <div className="relative min-h-0 flex-1">
            <div
              ref={messagesContainerRef}
              className="h-full overflow-y-auto px-4 py-4 sm:px-6"
            >
              {!selectedConversationId ? (
                <div className="flex h-full min-h-[420px] items-center justify-center">
                  <EmptyState
                    icon={MessageCircle}
                    title="No conversation selected"
                    description="Pick a conversation to continue the discussion."
                    action={
                      onlineUsers.length ? (
                        <button
                          type="button"
                          onClick={() => openConversation(onlineUsers[0].id)}
                          className="btn gap-2"
                        >
                          <Sparkles size={14} />
                          Start chatting
                        </button>
                      ) : null
                    }
                  />
                </div>
              ) : messageLoading ? (
                <MessageSkeleton />
              ) : messages.length === 0 ? (
                <div className="flex h-full min-h-[420px] items-center justify-center">
                  <EmptyState
                    icon={MessageCircle}
                    title="Start the conversation"
                    description="Messages will appear here as soon as you begin chatting."
                  />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {messages.map(message => (
                    <Bubble
                      key={message.id || `${message.senderId}-${message.sentAt || message.createdAt}`}
                      message={message}
                      mine={String(message.senderId) === currentUserId}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {newMessagesAvailable && !isAtBottomRef.current && (
              <div className="pointer-events-none absolute bottom-20 left-0 right-0 flex justify-center px-4">
                <button
                  type="button"
                  onClick={() => scrollToBottom()}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-lg hover:bg-primary-soft"
                  aria-label="Scroll to newest messages"
                >
                  <ArrowLeft size={14} className="rotate-[-90deg]" />
                  New messages
                </button>
              </div>
            )}
          </div>

          <footer className="sticky bottom-0 border-t border-border bg-surface/96 px-4 py-3 backdrop-blur-xl sm:px-5">
            {error && (
              <div className="mb-3 rounded-2xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="flex items-end gap-2 sm:gap-3">
              <textarea
                ref={textareaRef}
                className="min-h-[52px] max-h-36 flex-1 resize-none rounded-2xl py-3 text-sm shadow-sm"
                value={draft}
                onChange={e => {
                  setError('')
                  setDraft(e.target.value)
                }}
                placeholder={
                  selectedConversationId
                    ? 'Type a message...'
                    : 'Select a conversation first'
                }
                disabled={!selectedConversationId}
                rows={1}
                onKeyDown={handleKeyDown}
                aria-label="Message composer"
              />
              <button
                type="button"
                className="btn h-[52px] w-[52px] flex-shrink-0 rounded-2xl p-0 shadow-sm"
                onClick={send}
                disabled={!selectedConversationId || !draft.trim() || connectionState !== 'connected'}
                title="Send message"
                aria-label="Send message"
              >
                {connectionState !== 'connected' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] text-muted">
              <span>Enter to send, Shift+Enter for a new line</span>
              <span className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${connectionState === 'connected' ? 'bg-success' : connectionState === 'connecting' ? 'bg-warning' : 'bg-danger'}`} />
                {connectionState === 'connected'
                  ? 'Live connection'
                  : connectionState === 'connecting'
                    ? 'Reconnecting...'
                    : 'Offline'}
              </span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
