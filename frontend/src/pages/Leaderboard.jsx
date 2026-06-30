import { useCallback, useEffect, useMemo, useState } from 'react'
import { Crown, Medal, NotebookPen, Sparkles, TrendingUp } from 'lucide-react'
import { reputationApi } from '../api/services'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/SkeletonCard'

function sectionVariant(title) {
  const normalized = title.toLowerCase()
  if (normalized.includes('upload')) return 'emerald'
  if (normalized.includes('seller')) return 'amber'
  return 'brand'
}

function LeaderboardSection({ title, description, items, emptyIcon: Icon }) {
  const variant = sectionVariant(title)

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Badge variant="brand" className="gap-1.5">
            <Sparkles size={10} />
            {title}
          </Badge>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>

      {items.length ? (
        <div className="grid gap-3">
          {items.map((item, index) => (
            <div
              key={item.userId}
              className={`rounded-3xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                index === 0 ? 'border-primary/20 bg-primary-soft/40' : 'border-border bg-surface'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  variant === 'emerald' ? 'bg-success-soft text-success' :
                  variant === 'amber' ? 'bg-warning-soft text-warning' :
                  'bg-primary-soft text-primary'
                }`}>
                  {index === 0 ? <Crown size={18} /> : index === 1 ? <Medal size={18} /> : <TrendingUp size={18} />}
                </div>
                <Avatar name={item.userName || 'User'} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{item.userName}</p>
                    <Badge variant={variant}>{item.badge}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.level}</p>
                </div>
                <div className="flex flex-col items-start gap-0 sm:items-end sm:text-right">
                  <p className="text-2xl font-bold text-foreground">{item.metric}</p>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {variant === 'amber' ? 'Sales' : variant === 'emerald' ? 'Uploads' : 'Score'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Icon}
          title={`No ${title.toLowerCase()}`}
          description="This section will populate once the community activity grows."
        />
      )}
    </section>
  )
}

export default function Leaderboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const loadLeaderboard = useCallback(async (cancelledRef) => {
    setLoading(true)
    setError('')
    try {
      const response = await reputationApi.leaderboard()
      if (!cancelledRef?.current) setData(response.data || null)
    } catch (err) {
      if (!cancelledRef?.current) {
        setError(err?.response?.data?.message || 'Could not load the leaderboard.')
        setData(null)
      }
    } finally {
      if (!cancelledRef?.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cancelledRef = { current: false }
    void loadLeaderboard(cancelledRef)
    return () => {
      cancelledRef.current = true
    }
  }, [loadLeaderboard])

  const sections = useMemo(() => ({
    topContributors: data?.topContributors || [],
    topNoteUploaders: data?.topNoteUploaders || [],
    topSellers: data?.topSellers || [],
  }), [data])

  return (
    <div className="space-y-8 animate-in">
      <section className="hero-panel px-5 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="hero-kicker">
            <Sparkles size={12} />
            Reputation leaderboard
          </div>
          <h1 className="hero-title max-w-3xl">See who is shaping CampusShare.</h1>
          <p className="hero-copy max-w-2xl">
            The leaderboard highlights the most trusted contributors, top note uploaders, and strongest sellers across the platform.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-3xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => void loadLeaderboard()} className="btn-secondary gap-2 self-start">
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-8">
          <LeaderboardSection
            title="Top Contributors"
            description="Users with the highest overall Campus Score."
            items={sections.topContributors}
            emptyIcon={Crown}
          />
          <LeaderboardSection
            title="Top Note Uploaders"
            description="Members who contribute the most study material."
            items={sections.topNoteUploaders}
            emptyIcon={NotebookPen}
          />
          <LeaderboardSection
            title="Top Sellers"
            description="Members with the most completed sales."
            items={sections.topSellers}
            emptyIcon={Medal}
          />
        </div>
      )}
    </div>
  )
}
