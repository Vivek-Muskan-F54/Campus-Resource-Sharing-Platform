import { useCallback, useEffect, useMemo, useState } from 'react'
import { Award, BadgeCheck, BarChart3, Crown, Sparkles, Trophy } from 'lucide-react'
import { reputationApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonStat } from '../components/ui/SkeletonCard'

function levelVariant(level) {
  if (!level) return 'brand'
  const normalized = String(level).toLowerCase()
  if (normalized.includes('silver')) return 'emerald'
  if (normalized.includes('gold')) return 'amber'
  if (normalized.includes('champion')) return 'purple'
  return 'brand'
}

function ProgressBar({ value = 0 }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-surface-elevated">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary via-info to-success transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="card space-y-3">
      <div className="inline-flex rounded-2xl bg-primary-soft p-3 text-primary">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reputation, setReputation] = useState(null)

  const loadProfile = useCallback(async (cancelledRef) => {
    setLoading(true)
    setError('')
    try {
      const response = await reputationApi.me()
      if (!cancelledRef?.current) setReputation(response.data || null)
    } catch (err) {
      if (!cancelledRef?.current) {
        setError(err?.response?.data?.message || 'Could not load your reputation profile.')
        setReputation(null)
      }
    } finally {
      if (!cancelledRef?.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cancelledRef = { current: false }
    void loadProfile(cancelledRef)
    return () => {
      cancelledRef.current = true
    }
  }, [loadProfile])

  const progress = reputation?.progress || { currentScore: 0, nextThreshold: null, percent: 0, nextLevel: null }
  const badgeVariant = useMemo(() => levelVariant(reputation?.level), [reputation?.level])

  return (
    <div className="space-y-8 animate-in">
      <section className="hero-panel overflow-hidden px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <div className="hero-kicker">
              <Sparkles size={12} />
              Campus reputation
            </div>
            <div className="space-y-3">
              <h1 className="hero-title max-w-3xl">
                Your contribution score, badge, and progress live here.
              </h1>
              <p className="hero-copy max-w-2xl">
                CampusShare rewards useful notes, trusted selling, verified accounts, and positive community feedback.
              </p>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name || user?.email || 'User'} size="xl" />
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-[0.18em] text-muted">Profile</p>
                <h2 className="truncate text-2xl font-bold text-foreground">
                  {user?.name || 'Campus user'}
                </h2>
                <p className="truncate text-sm text-muted">{user?.email}</p>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <SkeletonStat key={index} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Campus score" value={reputation?.score ?? 0} icon={Trophy} />
                <StatCard label="Profile level" value={reputation?.level || 'Bronze Contributor'} icon={Award} />
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-3xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => void loadProfile()} className="btn-secondary gap-2 self-start">
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card space-y-4">
            <div className="skeleton h-6 w-40 rounded-full" />
            <div className="skeleton h-4 w-2/3 rounded-full" />
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-5/6 rounded-full" />
          </div>
          <div className="card space-y-4">
            <div className="skeleton h-6 w-40 rounded-full" />
            <div className="skeleton h-12 w-full rounded-2xl" />
            <div className="skeleton h-12 w-full rounded-2xl" />
          </div>
        </div>
      ) : reputation ? (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="card space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Current badge</p>
                <h2 className="mt-1 text-2xl font-bold text-foreground">{reputation.badge}</h2>
              </div>
              <Badge variant={badgeVariant} className="px-4 py-1.5 text-sm">
                <BadgeCheck size={13} />
                {reputation.badge}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Progress to next level</span>
                <span>
                  {progress.nextThreshold ? `${progress.currentScore}/${progress.nextThreshold}` : 'Max level reached'}
                </span>
              </div>
              <ProgressBar value={progress.percent || 0} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {progress.nextLevel ? `Next: ${progress.nextLevel}` : 'You have reached the highest level'}
                </span>
                <span className="font-semibold text-foreground">{progress.percent || 0}%</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Score</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{reputation.score}</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Level</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{reputation.level}</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Badge</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{reputation.badge}</p>
              </div>
            </div>
          </section>

          <section className="card space-y-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              <h2 className="text-xl font-bold text-foreground">How the score grows</h2>
            </div>

            <div className="space-y-3 text-sm text-muted">
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="font-semibold text-foreground">Upload a note</p>
                <p className="mt-1">+10 points when your note is added.</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="font-semibold text-foreground">Get a note approved</p>
                <p className="mt-1">+20 points when moderation approves your note.</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="font-semibold text-foreground">Complete a sale</p>
                <p className="mt-1">+15 points when a QR-verified order is completed.</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="font-semibold text-foreground">Receive positive feedback</p>
                <p className="mt-1">+5 points for strong ratings from other users.</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="font-semibold text-foreground">Verify your account</p>
                <p className="mt-1">+25 points once your campus identity is approved.</p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          icon={Crown}
          title="No reputation profile yet"
          description="As soon as you contribute notes, verify your account, or complete sales, your Campus Score will appear here."
        />
      )}
    </div>
  )
}
