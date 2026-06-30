import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  ShieldCheck,
  Star,
  TrendingUp,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminApi, listingApi, noteApi, notificationApi } from '../api/services'
import Avatar from '../components/ui/Avatar'
import Badge, { StatusBadge } from '../components/ui/Badge'
import { SkeletonRow, SkeletonStat } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'verifications', label: 'Verifications', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'notes', label: 'Notes', icon: FileText },
]

const CHART_COLORS = [
  'rgb(var(--color-primary))',
  'rgb(var(--color-info))',
  'rgb(139 92 246)',
  'rgb(var(--color-warning))',
  'rgb(var(--color-danger))',
  'rgb(var(--color-success))',
]

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : ''
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function daysBack(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (count - 1 - index))
    return date
  })
}

function byDay(items, key, label) {
  const map = new Map()
  daysBack(7).forEach(date => {
    const dayKey = date.toISOString().slice(0, 10)
    map.set(dayKey, { day: date, [label]: 0 })
  })

  items.forEach(item => {
    const dayKey = new Date(item[key] || Date.now()).toISOString().slice(0, 10)
    if (map.has(dayKey)) {
      map.get(dayKey)[label] += 1
    }
  })

  return [...map.values()].map(entry => ({
    name: entry.day.toLocaleDateString('en-IN', { weekday: 'short' }),
    [label]: entry[label],
  }))
}

function combineFeed({ products, notes, notifications }) {
  const marketplace = products.map(item => ({
    id: `product-${item.id}`,
    type: 'marketplace',
    title: item.title,
    subtitle: item.category || 'Marketplace item',
    meta: `Rs. ${Number(item.price || 0).toLocaleString('en-IN')} - ${item.seller || 'Campus seller'}`,
    createdAt: item.createdAt,
    link: '/',
    tone: 'brand',
  }))

  const noteItems = notes.map(item => ({
    id: `note-${item.id}`,
    type: 'note',
    title: item.title,
    subtitle: `${item.branch} - Sem ${item.semester}`,
    meta: `${item.subject} - ${item.downloadCount ?? 0} downloads`,
    createdAt: item.createdAt,
    link: '/notes',
    tone: 'purple',
  }))

  const notificationItems = notifications.map(item => ({
    id: `notification-${item.id}`,
    type: item.type?.toLowerCase() || 'system',
    title: item.message,
    subtitle: item.readFlag ? 'Read' : 'Unread',
    meta: item.link || '/notifications',
    createdAt: item.createdAt,
    link: item.link || '/notifications',
    tone: item.readFlag ? 'slate' : 'amber',
  }))

  return [...marketplace, ...noteItems, ...notificationItems]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 8)
}

function StatCard({ label, value, helper, icon: Icon, tone = 'brand', progress, trend }) {
  const toneStyles = {
    brand: 'bg-primary-soft text-primary ring-1 ring-primary/10',
    success: 'bg-success-soft text-success ring-1 ring-success/10',
    warning: 'bg-warning-soft text-warning ring-1 ring-warning/10',
    danger: 'bg-danger-soft text-danger ring-1 ring-danger/10',
    info: 'bg-info-soft text-info ring-1 ring-info/10',
    slate: 'bg-surface-elevated text-muted ring-1 ring-border',
  }
  return (
    <div className="card overflow-hidden border-border/80 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-2xl p-3 ${toneStyles[tone] || toneStyles.brand}`}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="slate" className="shrink-0">
            Live
          </Badge>
          {trend && (
            <Badge variant={trend.variant || 'emerald'} className="shrink-0">
              <TrendingUp size={12} />
              {trend.label}
            </Badge>
          )}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-foreground">{value ?? 0}</p>
        <p className="mt-1 text-sm font-medium text-muted">{label}</p>
        {helper && <p className="mt-1 text-xs text-muted">{helper}</p>}
      </div>
      {typeof progress === 'number' && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-success"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}

function FeedItem({ item }) {
  const toneMap = {
    brand: 'bg-primary-soft text-primary ring-1 ring-primary/10',
    purple: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-900/50',
    amber: 'bg-warning-soft text-warning ring-1 ring-warning/10',
    slate: 'bg-surface-elevated text-muted ring-1 ring-border',
  }

  const iconMap = {
    marketplace: Package,
    note: FileText,
    message: MessageCircle,
    verification: ShieldCheck,
    system: Activity,
    order: TrendingUp,
  }

  const Icon = iconMap[item.type] || Activity

  return (
    <a
      href={item.link || '#'}
      className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <div className={`rounded-2xl p-2.5 ${toneMap[item.tone] || toneMap.slate}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {item.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {item.subtitle}
            </p>
          </div>
          <ChevronRight size={14} className="mt-0.5 flex-shrink-0 text-muted" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span>{item.meta}</span>
          {item.createdAt && <span>- {formatTime(item.createdAt)}</span>}
        </div>
      </div>
    </a>
  )
}

function ActivityRow({ label, value, hint }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3 shadow-sm">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <Badge variant="brand">{value}</Badge>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [verifications, setVerifications] = useState([])
  const [products, setProducts] = useState([])
  const [notes, setNotes] = useState([])
  const [recentProducts, setRecentProducts] = useState([])
  const [recentNotes, setRecentNotes] = useState([])
  const [recentNotifications, setRecentNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [idCardModal, setIdCardModal] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [
        dash,
        userPage,
        verPage,
        prodPage,
        notePage,
        recentProductPage,
        recentNotePage,
        notificationPage,
      ] = await Promise.all([
        adminApi.dashboard(),
        adminApi.users({ page: 0, size: 8, sort: 'createdAt,desc' }),
        adminApi.verifications({ status: 'PENDING', page: 0, size: 8, sort: 'createdAt,desc' }),
        adminApi.products({ status: 'ACTIVE', page: 0, size: 8, sort: 'createdAt,desc' }),
        adminApi.notes({ status: 'PENDING', page: 0, size: 8, sort: 'createdAt,desc' }),
        listingApi.search({ status: 'ACTIVE', page: 0, size: 6, sort: 'createdAt,desc' }),
        noteApi.all({ page: 0, size: 6, sort: 'createdAt,desc' }),
        notificationApi.all({ page: 0, size: 8, sort: 'createdAt,desc' }),
      ])

      setStats(dash.data)
      setUsers(userPage.data?.content || [])
      setVerifications(verPage.data?.content || [])
      setProducts(prodPage.data?.content || [])
      setNotes(notePage.data?.content || [])
      setRecentProducts(recentProductPage.data?.content || [])
      setRecentNotes(recentNotePage.data?.content || [])
      setRecentNotifications(notificationPage.data?.content || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (fn, id) => {
    setActionLoading(id)
    try {
      await fn()
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Action failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const openNotePreview = async note => {
    if (!note?.id) return
    if (note.status === 'APPROVED') {
      window.open(noteApi.previewUrl(note.id), '_blank', 'noopener,noreferrer')
      return
    }

    try {
      const response = await noteApi.preview(note.id)
      const blobUrl = URL.createObjectURL(response.data)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
    } catch {
      setError('Unable to preview this note right now.')
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    await act(
      () => adminApi.rejectVerification(rejectModal.id, rejectRemarks || 'ID card is unclear'),
      rejectModal.id
    )
    setRejectModal(null)
    setRejectRemarks('')
  }

  const statCards = useMemo(() => {
    if (!stats) return []

    const activeUserRatio = stats.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0
    const activeProductRatio = stats.totalProducts ? Math.round((stats.activeProducts / stats.totalProducts) * 100) : 0
    const approvedNoteRatio = stats.totalNotes ? Math.round((stats.approvedNotes / stats.totalNotes) * 100) : 0
    const verifiedStudentRatio = stats.totalUsers ? Math.round((stats.verifiedStudents / stats.totalUsers) * 100) : 0

    return [
      {
        label: 'Total users',
        value: stats.totalUsers,
        helper: `${stats.activeUsers} active accounts`,
        icon: Users,
        tone: 'brand',
        trend: { label: `${activeUserRatio}% active`, variant: 'brand' },
        progress: activeUserRatio,
      },
      {
        label: 'Listings',
        value: stats.totalProducts,
        helper: `${stats.activeProducts} active listings`,
        icon: Package,
        tone: 'success',
        trend: { label: `${activeProductRatio}% live`, variant: 'emerald' },
        progress: activeProductRatio,
      },
      {
        label: 'Total notes',
        value: stats.totalNotes,
        helper: `${stats.approvedNotes} approved notes`,
        icon: FileText,
        tone: 'info',
        trend: { label: `${approvedNoteRatio}% approved`, variant: 'blue' },
        progress: approvedNoteRatio,
      },
      {
        label: 'Pending notes',
        value: stats.pendingNotes,
        helper: 'Awaiting moderation review',
        icon: Clock,
        tone: 'warning',
        trend: { label: `${stats.pendingNotes || 0} queued`, variant: 'amber' },
      },
      {
        label: 'Verification requests',
        value: stats.pendingVerifications,
        helper: `${stats.verifiedStudents} verified students`,
        icon: ShieldCheck,
        tone: 'warning',
        trend: { label: `${verifiedStudentRatio}% verified`, variant: 'amber' },
        progress: verifiedStudentRatio,
      },
      {
        label: 'Orders',
        value: stats.totalOrders,
        helper: 'Marketplace order volume',
        icon: TrendingUp,
        tone: 'success',
        trend: { label: 'Marketplace flow', variant: 'emerald' },
      },
      {
        label: 'Messages',
        value: stats.totalMessages,
        helper: 'Platform conversation activity',
        icon: MessageCircle,
        tone: 'slate',
        trend: { label: 'Real time', variant: 'slate' },
      },
    ]
  }, [stats])

  const trendData = useMemo(() => {
    return [
      ...byDay(recentProducts, 'createdAt', 'marketplace'),
      ...byDay(recentNotes, 'createdAt', 'notes'),
    ].reduce((acc, item, index, arr) => {
      const existing = acc.find(row => row.name === item.name)
      if (existing) {
        existing.marketplace = item.marketplace ?? existing.marketplace ?? 0
        existing.notes = item.notes ?? existing.notes ?? 0
      } else {
        acc.push({
          name: item.name,
          marketplace: item.marketplace || 0,
          notes: item.notes || 0,
        })
      }
      return acc
    }, [])
  }, [recentNotes, recentProducts])

  const activityFeed = useMemo(
    () => combineFeed({ products: recentProducts, notes: recentNotes, notifications: recentNotifications }),
    [recentNotes, recentNotifications, recentProducts]
  )

  const dashboardBreakdown = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Users', value: stats.totalUsers },
      { name: 'Products', value: stats.totalProducts },
      { name: 'Notes', value: stats.totalNotes },
      { name: 'Orders', value: stats.totalOrders },
      { name: 'Messages', value: stats.totalMessages },
      { name: 'Pending verifications', value: stats.pendingVerifications },
    ].filter(item => item.value > 0)
  }, [stats])

  return (
    <div className="space-y-7 animate-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-primary-soft p-3 ring-1 ring-primary/10">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="page-title">Admin Dashboard</h1>
              <p className="text-muted">
                A live view of marketplace, notes, notifications, and moderation activity.
              </p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="btn-secondary gap-1.5 self-start lg:self-auto">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="btn-secondary gap-2 self-start">
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto rounded-[24px] border border-border bg-surface p-2 shadow-sm no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all -mb-px ${
              tab === t.id
                ? 'border-primary bg-primary-soft text-primary shadow-sm'
                : 'border-transparent text-muted hover:border-border hover:bg-surface-elevated hover:text-foreground'
            }`}
          >
            <t.icon size={15} />
            {t.label}
            {t.id === 'verifications' && verifications.length > 0 && !loading && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white">
                {verifications.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonStat key={index} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {statCards.map(card => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>
          )}

          {!loading && stats && (
            <div className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
              <div className="section-shell">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Analytics charts</h3>
                    <p className="text-sm text-muted">
                      Recent marketplace and notes creation trends over the last 7 days.
                    </p>
                  </div>
                  <Badge variant="slate">{trendData.length} points</Badge>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
                  <div className="h-[420px] rounded-[28px] border border-border bg-surface p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-medium text-muted">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        Marketplace
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                        Notes
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="marketplaceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="rgb(var(--color-primary))" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="rgb(var(--color-primary))" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="notesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="rgb(139 92 246)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="rgb(139 92 246)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '16px',
                            border: '1px solid rgb(var(--color-border))',
                            boxShadow: '0 20px 40px rgb(var(--color-shadow) / 0.08)',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="marketplace"
                          name="Marketplace"
                          stroke="rgb(var(--color-primary))"
                          fill="url(#marketplaceGradient)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="notes"
                          name="Notes"
                          stroke="rgb(139 92 246)"
                          fill="url(#notesGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    <div className="surface-soft p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-foreground">Platform mix</h4>
                        <Badge variant="brand">Overview</Badge>
                      </div>
                      <div className="mt-4 h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dashboardBreakdown}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={55}
                              outerRadius={82}
                              paddingAngle={3}
                            >
                              {dashboardBreakdown.map((entry, index) => (
                                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: '16px',
                                border: '1px solid rgb(var(--color-border))',
                                boxShadow: '0 20px 40px rgb(var(--color-shadow) / 0.08)',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <ActivityRow
                        label="Pending verifications"
                        value={stats.pendingVerifications}
                        hint="Students waiting for approval"
                      />
                      <ActivityRow
                        label="Active products"
                        value={stats.activeProducts}
                        hint="Live marketplace inventory"
                      />
                      <ActivityRow
                        label="Approved notes"
                        value={stats.approvedNotes}
                        hint="Publicly available study PDFs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && stats && (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <div className="card xl:col-span-1">
                <div className="mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-warning" />
                  <h3 className="font-semibold text-foreground">Activity feed</h3>
                </div>
                {activityFeed.length ? (
                  <div className="space-y-3">
                    {activityFeed.map(item => (
                      <FeedItem key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No recent activity"
                    description="New listings, notes, and notifications will appear here."
                  />
                )}
              </div>

              <div className="card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Recent marketplace activity</h3>
                    <p className="text-sm text-muted">Latest active products from the marketplace.</p>
                  </div>
                  <Badge variant="brand">{recentProducts.length}</Badge>
                </div>
                {recentProducts.length ? (
                  <div className="space-y-3">
                    {recentProducts.map(item => (
                      <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-surface-elevated">
                          {item.imageUrls?.[0] ? (
                            <img src={item.imageUrls[0]} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package size={18} className="text-text-subtle" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.category && <Badge variant="slate">{item.category}</Badge>}
                            {item.type && <StatusBadge status={item.type} />}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                            <span>{item.seller || 'Campus seller'}</span>
                            <span className="font-semibold text-primary">
                              Rs. {Number(item.price || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Package} title="No recent marketplace items" />
                )}
              </div>

              <div className="card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Recent notes activity</h3>
                    <p className="text-sm text-muted">Latest public notes and download activity.</p>
                  </div>
                  <Badge variant="purple">{recentNotes.length}</Badge>
                </div>
                {recentNotes.length ? (
                  <div className="space-y-3">
                    {recentNotes.map(note => (
                      <div key={note.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
                        <div className="rounded-xl bg-info-soft p-2.5 text-info">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{note.title}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {note.branch && <Badge variant="brand">{note.branch}</Badge>}
                            {note.subject && <Badge variant="purple">{note.subject}</Badge>}
                            {note.semester && <Badge variant="slate">Sem {note.semester}</Badge>}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                            <span>{note.uploaderName || 'Anonymous'}</span>
                            <span>{note.downloadCount ?? 0} downloads</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={FileText} title="No recent notes" />
                )}
              </div>

              <div className="card lg:col-span-2 xl:col-span-1">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Recent notifications</h3>
                    <p className="text-sm text-muted">Notifications sent to the admin account.</p>
                  </div>
                  <Badge variant="amber">{recentNotifications.length}</Badge>
                </div>
                {recentNotifications.length ? (
                  <div className="space-y-3">
                    {recentNotifications.map(notification => (
                      <div key={notification.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
                        <div className={`rounded-xl p-2.5 ${
                          notification.readFlag
                            ? 'bg-surface-elevated text-muted'
                            : 'bg-warning-soft text-warning'
                        }`}>
                          <BellIcon notificationType={notification.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {notification.message}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>{notification.type}</span>
                            <span>-</span>
                            <span>{formatTime(notification.createdAt)}</span>
                          </div>
                        </div>
                        <Badge variant={notification.readFlag ? 'slate' : 'amber'}>
                          {notification.readFlag ? 'Read' : 'Unread'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={MessageCircle} title="No recent notifications" />
                )}
              </div>
            </div>
          )}

          {!loading && !stats && (
            <div className="card">
              <EmptyState
                icon={AlertCircle}
                title="Dashboard data unavailable"
                description="We could not load the admin summary right now."
                action={
                  <button type="button" onClick={load} className="btn gap-2">
                    <RefreshCw size={14} />
                    Retry
                  </button>
                }
              />
            </div>
          )}
        </div>
      )}

      {tab === 'verifications' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">Pending ID Verifications</h2>
            <Badge variant="amber">{verifications.length} pending</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : verifications.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="All clear!" description="No pending verifications right now." />
          ) : (
            <div className="space-y-3">
              {verifications.map(item => (
                <div key={item.id} className="card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Avatar name={item.studentName || 'U'} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{item.studentName}</p>
                      <p className="text-sm text-muted">{item.studentEmail}</p>
                      <p className="mt-0.5 text-xs text-text-subtle">
                        Submitted: {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                      {item.idCardUrl && (
                        <button onClick={() => setIdCardModal(item)} className="btn-secondary gap-1.5 text-sm">
                          <Eye size={13} />
                          View ID
                        </button>
                      )}
                      <button
                        disabled={actionLoading === item.id}
                        onClick={() => act(() => adminApi.approveVerification(item.id, 'Approved by admin'), item.id)}
                        className="btn-emerald w-full justify-center gap-1.5 text-sm sm:w-auto"
                      >
                        <CheckCircle2 size={13} />
                        Approve
                      </button>
                      <button
                        disabled={actionLoading === item.id}
                        onClick={() => {
                          setRejectModal(item)
                          setRejectRemarks('')
                        }}
                        className="btn-danger w-full justify-center gap-1.5 text-sm sm:w-auto"
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">All Users</h2>
            <Badge variant="slate">{users.length} loaded</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No users found" />
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="card">
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar name={u.name || u.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{u.name}</p>
                        <StatusBadge status={u.verificationStatus || 'PENDING'} />
                        {!u.enabled && <Badge variant="red">Blocked</Badge>}
                      </div>
                      <p className="text-sm text-muted">{u.email}</p>
                      {u.collegeRollNumber && (
                        <p className="text-xs text-text-subtle">Roll: {u.collegeRollNumber}</p>
                      )}
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      {u.enabled ? (
                        <button
                          disabled={actionLoading === u.id}
                          onClick={() => act(() => adminApi.blockUser(u.id), u.id)}
                          className="btn-danger w-full justify-center gap-1.5 text-sm sm:w-auto"
                        >
                          <Ban size={13} />
                          Block
                        </button>
                      ) : (
                        <button
                          disabled={actionLoading === u.id}
                          onClick={() => act(() => adminApi.unblockUser(u.id), u.id)}
                          className="btn w-full justify-center gap-1.5 text-sm sm:w-auto"
                        >
                          <CheckCircle2 size={13} />
                          Unblock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">Active Products</h2>
            <Badge variant="slate">{products.length} loaded</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : products.length === 0 ? (
            <EmptyState icon={Package} title="No products found" />
          ) : (
            <div className="space-y-3">
              {products.map(product => {
                const image = product.imageUrls?.[0]
                return (
                  <div key={product.id} className="card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface-elevated">
                        {image ? (
                          <img src={image} alt={product.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package size={18} className="text-text-subtle" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{product.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {product.category && <Badge variant="slate">{product.category}</Badge>}
                          {product.type && <StatusBadge status={product.type} />}
                          {product.condition && <StatusBadge status={product.condition} />}
                        </div>
                        {product.seller && (
                          <p className="mt-1 text-xs text-text-subtle">by {product.seller}</p>
                        )}
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <span className="font-bold text-primary">
                          Rs. {Number(product.price || 0).toLocaleString('en-IN')}
                        </span>
                        <button
                          disabled={actionLoading === product.id}
                          onClick={() => {
                            if (window.confirm('Remove this product? This action cannot be undone.')) {
                              act(() => adminApi.removeProduct(product.id), product.id)
                            }
                          }}
                          className="btn-danger w-full justify-center gap-1.5 text-sm sm:w-auto"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">Pending Notes</h2>
            <Badge variant="amber">{notes.length} pending</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : notes.length === 0 ? (
            <EmptyState icon={FileText} title="No pending notes" description="All notes have been reviewed." />
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex-shrink-0 rounded-xl bg-primary-soft p-3 text-primary">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{note.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {note.branch && <Badge variant="brand">{note.branch}</Badge>}
                        {note.subject && <Badge variant="purple">{note.subject}</Badge>}
                        {note.semester && <Badge variant="slate">Sem {note.semester}</Badge>}
                      </div>
                      {note.uploaderName && (
                        <p className="mt-1 text-xs text-text-subtle">by {note.uploaderName}</p>
                      )}
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      {note.status === 'PENDING' && (
                        <button
                          disabled={actionLoading === note.id}
                          onClick={() => act(() => adminApi.approveNote(note.id), note.id)}
                          className="btn-emerald w-full justify-center gap-1.5 text-sm sm:w-auto"
                        >
                          <CheckCircle2 size={13} />
                          Approve
                        </button>
                      )}
                      {note.fileUrl && (
                        <button type="button" onClick={() => openNotePreview(note)} className="btn-secondary gap-1.5 text-sm">
                          <Eye size={13} />
                          View
                        </button>
                      )}
                      <button
                        disabled={actionLoading === note.id}
                        onClick={() => {
                          if (window.confirm('Remove this note? This cannot be undone.')) {
                            act(() => adminApi.removeNote(note.id), note.id)
                          }
                        }}
                        className="btn-danger w-full justify-center gap-1.5 text-sm sm:w-auto"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!rejectModal}
        onClose={() => {
          setRejectModal(null)
          setRejectRemarks('')
        }}
        title="Reject Verification"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Provide a reason for rejection so the student knows how to fix it.
          </p>
          <div className="form-group">
            <label className="label">Rejection reason</label>
            <textarea
              rows={3}
              className="w-full resize-none"
              placeholder="e.g. ID card is blurry, name not visible..."
              value={rejectRemarks}
              onChange={e => setRejectRemarks(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModal(null)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleReject} className="btn-danger gap-2">
              <XCircle size={14} />
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!idCardModal} onClose={() => setIdCardModal(null)} title="ID Card Preview" size="lg">
        {idCardModal && (
          <div className="space-y-4 text-center">
            <img
              src={idCardModal.idCardUrl}
              alt="ID Card"
              className="mx-auto max-h-[70vh] rounded-2xl object-contain shadow-sm"
            />
            <p className="text-sm text-muted">
              {idCardModal.studentName} - {idCardModal.studentEmail}
            </p>
            <a
              href={idCardModal.idCardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary mt-3 inline-flex gap-1.5 text-sm"
            >
              <Eye size={13} />
              Open in new tab
            </a>
          </div>
        )}
      </Modal>
    </div>
  )
}

function BellIcon({ notificationType }) {
  const type = String(notificationType || '').toUpperCase()
  if (type === 'ORDER') return <TrendingUp size={16} />
  if (type === 'VERIFICATION') return <ShieldCheck size={16} />
  if (type === 'MESSAGE') return <MessageCircle size={16} />
  return <Activity size={16} />
}
