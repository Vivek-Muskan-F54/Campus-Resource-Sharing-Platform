import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, SlidersHorizontal, Package, BookOpen, MessageCircle,
  ShieldCheck, Star, ChevronDown, X, TrendingUp, ArrowRight,
  ShoppingBag, Users, FileText, Zap
} from 'lucide-react'
import { categoryApi, listingApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import ListingCard from '../components/ListingCard'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'

const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR']
const TYPES = ['SELL', 'RENT', 'EXCHANGE']

const STATS = [
  { icon: Users, label: 'Students', value: '2,400+', color: 'text-brand-500' },
  { icon: ShoppingBag, label: 'Listings', value: '1,800+', color: 'text-emerald-500' },
  { icon: FileText, label: 'Notes', value: '950+', color: 'text-purple-500' },
  { icon: Zap, label: 'Trades', value: '3,200+', color: 'text-amber-500' },
]

const FEATURES = [
  {
    icon: ShoppingBag,
    title: 'Campus Marketplace',
    desc: 'Buy, sell, rent, or exchange academic resources with verified students.',
    color: 'from-brand-500 to-indigo-600',
  },
  {
    icon: BookOpen,
    title: 'Study Notes Hub',
    desc: 'Share and download curated PDF notes organised by subject and semester.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: MessageCircle,
    title: 'Real-time Chat',
    desc: 'Message any student directly with WebSocket-powered instant messaging.',
    color: 'from-purple-500 to-violet-600',
  },
  {
    icon: ShieldCheck,
    title: 'Student Verification',
    desc: 'Verify your identity with your college ID for trusted transactions.',
    color: 'from-amber-500 to-orange-600',
  },
]

export default function Marketplace() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ q: '', categoryId: '', condition: '', type: '' })
  const { user } = useAuth()
  const debouncedQ = useDebounce(filters.q, 400)

  const load = useCallback(async (overrides = {}) => {
    setLoading(true)
    try {
      const params = { ...filters, ...overrides }
      // Remove empty values
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const res = await listingApi.search(params)
      setItems(res.data?.content || res.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [debouncedQ]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    categoryApi.all()
      .then(r => setCategories(r.data || []))
      .catch(() => setCategories([]))
  }, [])

  const handleSubmit = e => {
    e.preventDefault()
    load()
  }

  const clearFilters = () => {
    setFilters({ q: '', categoryId: '', condition: '', type: '' })
    load({ q: '', categoryId: '', condition: '', type: '' })
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-10 animate-in">
      {/* ─── Hero Section ────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl hero-gradient px-8 py-14 sm:px-12 sm:py-16 text-white shadow-glow">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />
        </div>

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3.5 py-1.5 text-sm font-medium mb-4 border border-white/20">
            <TrendingUp size={14} />
            Trusted by 2,400+ students
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Resources move further
            <br />
            <span className="text-brand-200">when campus shares.</span>
          </h1>
          <p className="text-brand-100 text-lg mb-8 max-w-xl">
            Buy, rent, exchange, and reuse everything students need — textbooks, lab kits, electronics, and more.
          </p>

          {/* Hero search */}
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search for textbooks, calculators…"
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                className="w-full border-0 bg-white/95 dark:bg-white pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-white shadow-lg"
              />
            </div>
            <button type="submit" className="btn-lg bg-white text-brand-700 hover:bg-white/90 shadow-lg border-0">
              Search
            </button>
          </form>

          {/* CTA links */}
          {!user && (
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 px-5 py-2.5 text-sm font-semibold hover:bg-brand-50 transition-colors shadow-md">
                Get started free <ArrowRight size={15} />
              </Link>
              <Link to="/notes" className="inline-flex items-center gap-2 rounded-xl border border-white/30 text-white px-5 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors">
                Browse notes
              </Link>
            </div>
          )}
          {user && (
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/create" className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 px-5 py-2.5 text-sm font-semibold hover:bg-brand-50 transition-colors shadow-md">
                + Create listing <ArrowRight size={15} />
              </Link>
              <Link to="/notes" className="inline-flex items-center gap-2 rounded-xl border border-white/30 text-white px-5 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors">
                Browse notes
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── Stats ───────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="card text-center p-4 sm:p-5">
            <s.icon size={24} className={`mx-auto mb-2 ${s.color}`} />
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ─── Search & Filters ────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Browse Listings</h2>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X size={14} />
                Clear ({activeFilterCount})
              </button>
            )}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`btn-secondary text-sm gap-1.5 ${showFilters ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-300' : ''}`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <form
            onSubmit={handleSubmit}
            className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up"
          >
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search listings..."
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                className="w-full pl-9"
              />
            </div>

            <select
              value={filters.categoryId}
              onChange={e => setFilters(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filters.condition}
              onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))}
              className="w-full"
            >
              <option value="">Any Condition</option>
              {CONDITIONS.map(c => (
                <option key={c} value={c}>{c.replace('_', ' ')}</option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="w-full"
            >
              <option value="">All Types</option>
              {TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end">
              <button type="button" onClick={clearFilters} className="btn-secondary text-sm">
                Reset
              </button>
              <button type="submit" className="btn text-sm">
                Apply filters
              </button>
            </div>
          </form>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No listings found"
            description="Try adjusting your filters or be the first to list something!"
            action={
              user ? (
                <Link to="/create" className="btn">Create a listing</Link>
              ) : (
                <Link to="/register" className="btn">Get started</Link>
              )
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(item => (
              <ListingCard
                key={item.id}
                item={item}
                user={user}
                onRequestSuccess={() => load()}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Features Section ────────────────────────── */}
      <section className="py-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Everything you need</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            A complete campus ecosystem — built for students, by students.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(f => (
            <div key={f.title} className="card group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} mb-4 shadow-lg`}>
                <f.icon size={20} className="text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer CTA ──────────────────────────────── */}
      {!user && (
        <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 border border-slate-700 p-8 sm:p-12 text-center">
          <Star size={32} className="mx-auto mb-4 text-amber-400" />
          <h2 className="text-3xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Join thousands of students already trading, sharing notes, and connecting on CampusShare.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-lg bg-brand-600 hover:bg-brand-700">
              Create free account
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 text-slate-300 px-6 py-3 text-base font-medium hover:bg-slate-700 transition-colors">
              Sign in
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
