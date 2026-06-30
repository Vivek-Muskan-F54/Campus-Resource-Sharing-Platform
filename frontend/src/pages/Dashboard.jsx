import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Clock3,
  Download,
  Sparkles,
  TrendingUp,
  Package,
  AlertCircle,
} from 'lucide-react'
import { dashboardApi, noteApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { activityTracker } from '../utils/activityTracker'
import NoteCard from '../components/NoteCard'
import ListingCard from '../components/ListingCard'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/SkeletonCard'

const PAGE_SIZE = 4
const BOOKMARK_KEY = 'campusshare_bookmarked_notes'

function readBookmarkSet() {
  if (typeof window === 'undefined') return new Set()
  try {
    const parsed = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]')
    return new Set((Array.isArray(parsed) ? parsed : []).map(String))
  } catch {
    return new Set()
  }
}

function writeBookmarkSet(next) {
  if (typeof window === 'undefined') return
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...next]))
}

function SectionShell({ eyebrow, title, description, action, children }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <Badge variant="brand" className="gap-1.5">
            <Sparkles size={10} />
            {eyebrow}
          </Badge>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
          <p className="text-sm leading-6 text-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function StatCard({ label, value, icon: Icon, tone = 'brand' }) {
  return (
    <div className="card space-y-3">
      <div className={`inline-flex rounded-2xl p-3 ${
        tone === 'emerald' ? 'bg-success-soft text-success' :
        tone === 'amber' ? 'bg-warning-soft text-warning' :
        tone === 'info' ? 'bg-info-soft text-info' :
        'bg-primary-soft text-primary'
      }`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground sm:text-2xl">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

function NotificationItem({ item }) {
  const href = item.link || null
  const content = (
    <div className={`rounded-3xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
      item.readFlag ? 'border-border bg-surface' : 'border-primary/20 bg-primary-soft/40'
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className={`mt-0.5 rounded-2xl p-2 ${
          item.readFlag ? 'bg-surface-elevated text-muted' : 'bg-primary text-white'
        }`}>
          <Bell size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <p className="truncate font-semibold text-foreground">{item.message}</p>
            {!item.readFlag && <Badge variant="brand">Unread</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <Clock3 size={12} />
            {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }) : 'Recently'}
          </div>
        </div>
      </div>
    </div>
  )

  if (!href) return content
  return href.startsWith('/') ? <Link to={href}>{content}</Link> : <a href={href}>{content}</a>
}

function NoteGrid({ items, bookmarkedIds, onToggleBookmark, onOpenPreview, onDownload, scoring = null }) {
  if (!items.length) return null

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(item => {
        const note = item.note || item
        const score = item.score ?? 0
        return (
          <div key={note.id} className="relative">
            {scoring && (
              <div className="absolute right-3 top-3 z-10 rounded-full bg-surface/95 px-2.5 py-1 text-[10px] font-semibold text-primary shadow-sm ring-1 ring-border">
                {scoring} {score}
              </div>
            )}
            <NoteCard
              note={note}
              bookmarked={bookmarkedIds.has(String(note.id))}
              rating={0}
              onToggleBookmark={onToggleBookmark}
              onOpenPreview={onOpenPreview}
              onDownload={onDownload}
            />
          </div>
        )
      })}
    </div>
  )
}

function ProductGrid({ items, user }) {
  if (!items.length) return null

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(item => (
        <ListingCard key={item.id} item={item.product || item} user={user} />
      ))}
    </div>
  )
}

function SkeletonStack({ count = 4, note = true }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        note ? (
          <SkeletonCard key={index} />
        ) : (
          <div key={index} className="card overflow-hidden p-0 animate-pulse">
            <div className="h-44 bg-surface-elevated" />
            <div className="space-y-3 p-4">
              <div className="skeleton h-4 w-3/4 rounded-lg" />
              <div className="skeleton h-3 w-1/2 rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <div className="skeleton h-14 rounded-xl" />
                <div className="skeleton h-14 rounded-xl" />
              </div>
              <div className="skeleton h-9 w-full rounded-xl" />
            </div>
          </div>
        )
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [bookmarkedIds, setBookmarkedIds] = useState(() => readBookmarkSet())

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleStorage = event => {
      if (event.key === BOOKMARK_KEY) setBookmarkedIds(readBookmarkSet())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await dashboardApi.personalized({ page: 0, size: PAGE_SIZE })
        if (!cancelled) setDashboard(response.data || null)
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Could not load your personalized dashboard.')
          setDashboard(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const sections = useMemo(() => {
    const defaults = {
      recommendedNotes: { content: [], totalElements: 0 },
      recommendedProducts: { content: [], totalElements: 0 },
      recentDownloads: { content: [], totalElements: 0 },
      bookmarkedNotes: { content: [], totalElements: 0 },
      trendingNotes: { content: [], totalElements: 0 },
      recentNotifications: { content: [], totalElements: 0 },
    }
    return { ...defaults, ...(dashboard || {}) }
  }, [dashboard])

  const handleToggleBookmark = noteId => {
    setBookmarkedIds(current => {
      const next = new Set(current)
      const key = String(noteId)
      const added = !next.has(key)
      if (added) next.add(key)
      else next.delete(key)
      writeBookmarkSet(next)
      void activityTracker.noteBookmarked(noteId, { action: added ? 'added' : 'removed' })
      return next
    })
  }

  const openPreview = note => {
    if (!note?.id) return
    window.open(noteApi.previewUrl(note.id), '_blank', 'noopener,noreferrer')
    void activityTracker.noteViewed(note.id, {
      title: note.title,
      branch: note.branch,
      subject: note.subject,
      source: 'dashboard',
    })
  }

  const downloadNote = note => {
    if (!note?.id) return
    void activityTracker.noteDownloaded(note.id, {
      title: note.title,
      branch: note.branch,
      subject: note.subject,
      source: 'dashboard',
    })
    window.open(noteApi.downloadUrl(note.id), '_blank', 'noopener,noreferrer')
  }

  const bannerStats = [
    { label: 'Recommended notes', value: sections.recommendedNotes.totalElements || sections.recommendedNotes.content.length, icon: BookOpen },
    { label: 'Trending notes', value: sections.trendingNotes.totalElements || sections.trendingNotes.content.length, icon: TrendingUp, tone: 'amber' },
    { label: 'Recent downloads', value: sections.recentDownloads.totalElements || sections.recentDownloads.content.length, icon: Download, tone: 'emerald' },
    { label: 'Unread notifications', value: sections.recentNotifications.content.filter(item => !item.readFlag).length, icon: Bell, tone: 'info' },
  ]

  return (
    <div className="space-y-8 animate-in">
      <section className="hero-panel overflow-hidden px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-5">
            <div className="hero-kicker">
              <Sparkles size={12} />
              Personalized dashboard
            </div>
            <div className="space-y-3">
              <h1 className="hero-title max-w-3xl">
                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
                Your study flow is ready.
              </h1>
              <p className="hero-copy max-w-2xl">
                CampusShare is learning from your notes, marketplace activity, bookmarks, and notifications to shape a dashboard that feels personal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/notes" className="btn gap-2">
                <BookOpen size={14} />
                Explore notes
              </Link>
              <Link to="/" className="btn-secondary gap-2">
                <Package size={14} />
                Browse marketplace
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {bannerStats.map(stat => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-3xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      <SectionShell
        eyebrow="For you"
        title="Recommended Notes"
        description="Fresh study notes ranked from your reading, downloads, ratings, and bookmarks."
      >
        {loading ? (
          <SkeletonStack />
        ) : sections.recommendedNotes.content.length ? (
          <NoteGrid
            items={sections.recommendedNotes.content}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onOpenPreview={openPreview}
            onDownload={downloadNote}
            scoring="Score "
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No recommendations yet"
            description="Keep exploring notes and CampusShare will tailor this section for you."
          />
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Campus pulse"
        title="Trending Notes"
        description="Most popular notes across the platform, ranked by downloads, bookmarks, and views."
      >
        {loading ? (
          <SkeletonStack />
        ) : sections.trendingNotes.content.length ? (
          <NoteGrid
            items={sections.trendingNotes.content}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onOpenPreview={openPreview}
            onDownload={downloadNote}
            scoring="Trend "
          />
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Nothing trending yet"
            description="As student activity grows, the most useful notes will surface here."
          />
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Continue learning"
        title="Recent Downloads"
        description="Pick up right where you left off with notes you've downloaded most recently."
      >
        {loading ? (
          <SkeletonStack />
        ) : sections.recentDownloads.content.length ? (
          <NoteGrid
            items={sections.recentDownloads.content}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onOpenPreview={openPreview}
            onDownload={downloadNote}
          />
        ) : (
          <EmptyState
            icon={Download}
            title="No recent downloads"
            description="Downloaded notes will appear here so you can jump back into them quickly."
          />
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Saved for later"
        title="Bookmarked Notes"
        description="A quick-access shelf of notes you have saved for revision or later study."
      >
        {loading ? (
          <SkeletonStack />
        ) : sections.bookmarkedNotes.content.length ? (
          <NoteGrid
            items={sections.bookmarkedNotes.content}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onOpenPreview={openPreview}
            onDownload={downloadNote}
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No bookmarks yet"
            description="Bookmark a note from the notes page to keep it close for later."
          />
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Marketplace"
        title="Recommended Products"
        description="Listings aligned with your marketplace browsing and purchase history."
      >
        {loading ? (
          <SkeletonStack note={false} />
        ) : sections.recommendedProducts.content.length ? (
          <ProductGrid items={sections.recommendedProducts.content} user={user} />
        ) : (
          <EmptyState
            icon={Package}
            title="No product picks yet"
            description="Browse the marketplace and your next recommendation set will get smarter."
          />
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Inbox"
        title="Recent Notifications"
        description="Recent updates from orders, chat, verification, and system activity."
      >
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-3xl bg-surface-elevated" />
            ))}
          </div>
        ) : sections.recentNotifications.content.length ? (
          <div className="grid gap-3">
            {sections.recentNotifications.content.map(item => (
              <NotificationItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No recent notifications"
            description="You'll see order updates, chat activity, and system notices here."
          />
        )}
      </SectionShell>
    </div>
  )
}
