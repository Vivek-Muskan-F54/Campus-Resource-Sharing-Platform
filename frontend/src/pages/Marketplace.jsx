import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, SlidersHorizontal, Package, BookOpen, MessageCircle,
  ShieldCheck, Star, X, TrendingUp, ArrowRight, ShoppingBag,
  Users, FileText, Zap, ChevronDown, LayoutGrid, List,
  SortAsc, Tag, Layers, DollarSign, RefreshCw
} from 'lucide-react'
import { categoryApi, listingApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import ListingCard from '../components/ListingCard'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'

// ─── Constants ─────────────────────────────────────────────────────────────────
const CONDITIONS = [
  { value: 'NEW',      label: 'New',       color: 'emerald' },
  { value: 'LIKE_NEW', label: 'Like New',  color: 'emerald' },
  { value: 'GOOD',     label: 'Good',      color: 'brand'   },
  { value: 'FAIR',     label: 'Fair',      color: 'amber'   },
  { value: 'POOR',     label: 'Poor',      color: 'red'     },
]

const TYPES = [
  { value: 'SELL',     label: 'For Sale',  color: 'emerald' },
  { value: 'RENT',     label: 'For Rent',  color: 'blue'    },
  { value: 'EXCHANGE', label: 'Exchange',  color: 'purple'  },
]

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first'  },
  { value: 'price,asc',      label: 'Price: Low → High' },
  { value: 'price,desc',     label: 'Price: High → Low' },
  { value: 'createdAt,asc',  label: 'Oldest first'  },
]

const STATS = [
  { icon: Users,      label: 'Students',     value: '2,400+', color: 'text-brand-500'   },
  { icon: ShoppingBag,label: 'Listings',     value: '1,800+', color: 'text-emerald-500' },
  { icon: FileText,   label: 'Notes Shared', value: '950+',   color: 'text-purple-500'  },
  { icon: Zap,        label: 'Trades Done',  value: '3,200+', color: 'text-amber-500'   },
]

const FEATURES = [
  { icon: ShoppingBag,  title: 'Campus Marketplace', desc: 'Buy, sell, rent, or exchange academic resources with verified students.',    color: 'from-brand-500 to-indigo-600'   },
  { icon: BookOpen,     title: 'Study Notes Hub',    desc: 'Share and download curated PDF notes organised by subject and semester.',   color: 'from-emerald-500 to-teal-600'   },
  { icon: MessageCircle,title: 'Real-time Chat',     desc: 'Message any student directly with WebSocket-powered instant messaging.',    color: 'from-purple-500 to-violet-600'  },
  { icon: ShieldCheck,  title: 'Student Verified',   desc: 'Verify your college ID for trusted, safer campus transactions.',            color: 'from-amber-500 to-orange-600'   },
]

const PRICE_PRESETS = [
  { label: 'Under ₹500',      min: '',    max: '500'  },
  { label: '₹500 – ₹2000',   min: '500', max: '2000' },
  { label: '₹2000 – ₹5000',  min: '2000',max: '5000' },
  { label: 'Above ₹5000',     min: '5000',max: ''     },
]

// ─── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick, color = 'slate' }) {
  const colors = {
    emerald: active ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-600',
    blue:    active ? 'bg-blue-500 text-white border-blue-500'       : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-600',
    purple:  active ? 'bg-purple-500 text-white border-purple-500'   : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-400 dark:hover:border-purple-600',
    amber:   active ? 'bg-amber-500 text-white border-amber-500'     : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-400 dark:hover:border-amber-600',
    red:     active ? 'bg-red-500 text-white border-red-500'         : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-400 dark:hover:border-red-600',
    brand:   active ? 'bg-brand-500 text-white border-brand-500'     : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-400 dark:hover:border-brand-600',
    slate:   active ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${colors[color] || colors.slate}`}
    >
      {label}
    </button>
  )
}

// ─── Sort dropdown ─────────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = SORT_OPTIONS.find(o => o.value === value) || SORT_OPTIONS[0]

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="btn-secondary text-sm gap-1.5 whitespace-nowrap"
      >
        <SortAsc size={14} />
        {current.label}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-30 overflow-hidden animate-slide-up">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                opt.value === value
                  ? 'text-brand-600 dark:text-brand-400 font-medium'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Active filter pill ────────────────────────────────────────────────────────
function ActivePill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/40 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300">
      {label}
      <button onClick={onRemove} className="hover:text-brand-900 dark:hover:text-brand-100 ml-0.5">
        <X size={11} />
      </button>
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Marketplace() {
  const [items, setItems]           = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [viewMode, setViewMode]     = useState('grid')   // 'grid' | 'list'
  const [sortBy, setSortBy]         = useState('createdAt,desc')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [priceMin, setPriceMin]     = useState('')
  const [priceMax, setPriceMax]     = useState('')
  const [filters, setFilters]       = useState({
    q: '', categoryId: '', condition: '', type: ''
  })
  const { user } = useAuth()
  const debouncedQ = useDebounce(filters.q, 350)

  // Build params for the API call
  const buildParams = useCallback((overrides = {}) => {
    const merged = { ...filters, ...overrides }
    const [sortField, sortDir] = sortBy.split(',')
    const params = { sort: `${sortField},${sortDir}` }
    if (merged.q)          params.q          = merged.q
    if (merged.categoryId) params.categoryId = merged.categoryId
    if (merged.condition)  params.condition  = merged.condition
    if (merged.type)       params.type       = merged.type
    if (priceMin)          params.minPrice   = priceMin
    if (priceMax)          params.maxPrice   = priceMax
    return params
  }, [filters, sortBy, priceMin, priceMax])

  const load = useCallback(async (overrides = {}) => {
    setLoading(true)
    try {
      const res = await listingApi.search(buildParams(overrides))
      setItems(res.data?.content || res.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  // Reload when debounced search or sort changes
  useEffect(() => { load() }, [debouncedQ, sortBy]) // eslint-disable-line

  // Load categories once
  useEffect(() => {
    categoryApi.all()
      .then(r => setCategories(r.data || []))
      .catch(() => setCategories([]))
  }, [])

  const toggle = (field, value) =>
    setFilters(f => ({ ...f, [field]: f[field] === value ? '' : value }))

  const clearAll = () => {
    setFilters({ q: '', categoryId: '', condition: '', type: '' })
    setPriceMin('')
    setPriceMax('')
    load({ q: '', categoryId: '', condition: '', type: '' })
  }

  const applyPricePreset = preset => {
    setPriceMin(preset.min)
    setPriceMax(preset.max)
  }

  // Count active non-search filters
  const activeCount = [
    filters.categoryId, filters.condition, filters.type,
    priceMin || priceMax ? 'price' : ''
  ].filter(Boolean).length

  // Active filter pills data
  const activePills = [
    filters.categoryId && {
      label: categories.find(c => String(c.id) === String(filters.categoryId))?.name || 'Category',
      clear: () => setFilters(f => ({ ...f, categoryId: '' }))
    },
    filters.condition && {
      label: CONDITIONS.find(c => c.value === filters.condition)?.label || filters.condition,
      clear: () => setFilters(f => ({ ...f, condition: '' }))
    },
    filters.type && {
      label: TYPES.find(t => t.value === filters.type)?.label || filters.type,
      clear: () => setFilters(f => ({ ...f, type: '' }))
    },
    (priceMin || priceMax) && {
      label: `₹${priceMin || '0'} – ₹${priceMax || '∞'}`,
      clear: () => { setPriceMin(''); setPriceMax('') }
    },
  ].filter(Boolean)

  return (
    <div className="space-y-10 animate-in">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl hero-gradient px-8 py-14 sm:px-12 sm:py-16 text-white shadow-glow">
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

          {/* Hero search bar */}
          <form
            onSubmit={e => { e.preventDefault(); load() }}
            className="flex gap-2 max-w-xl"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search for textbooks, calculators…"
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                className="w-full border-0 bg-white/95 dark:bg-white pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-white shadow-lg"
                aria-label="Search listings"
              />
            </div>
            <button type="submit" className="btn-lg bg-white text-brand-700 hover:bg-white/90 shadow-lg border-0">
              Search
            </button>
          </form>

          {/* Quick type chips inside hero */}
          <div className="flex flex-wrap gap-2 mt-5">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { toggle('type', t.value); load({ type: filters.type === t.value ? '' : t.value }) }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  filters.type === t.value
                    ? 'bg-white text-brand-700 border-white'
                    : 'border-white/30 text-white hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-6">
            {user ? (
              <Link to="/create" className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 px-5 py-2.5 text-sm font-semibold hover:bg-brand-50 transition-colors shadow-md">
                + Create listing <ArrowRight size={15} />
              </Link>
            ) : (
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 px-5 py-2.5 text-sm font-semibold hover:bg-brand-50 transition-colors shadow-md">
                Get started free <ArrowRight size={15} />
              </Link>
            )}
            <Link to="/notes" className="inline-flex items-center gap-2 rounded-xl border border-white/30 text-white px-5 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors">
              Browse notes
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="card text-center p-4 sm:p-5 hover:shadow-card-hover transition-shadow">
            <s.icon size={24} className={`mx-auto mb-2 ${s.color}`} />
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Browse section ──────────────────────────────────────────────── */}
      <section className="space-y-4">

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Browse Listings</h2>
            {!loading && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {items.length} {items.length === 1 ? 'listing' : 'listings'} found
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={12} />
                Clear all ({activeCount})
              </button>
            )}
            <SortDropdown value={sortBy} onChange={v => { setSortBy(v) }} />
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className={`btn-secondary text-sm gap-1.5 ${showAdvanced ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300' : ''}`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeCount > 0 && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </button>
            {/* View mode toggle */}
            <div className="hidden sm:flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                aria-label="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                aria-label="List view"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Active filter pills */}
        {activePills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activePills.map((pill, i) => (
              <ActivePill key={i} label={pill.label} onRemove={() => { pill.clear(); load() }} />
            ))}
          </div>
        )}

        {/* Advanced filter panel */}
        {showAdvanced && (
          <div className="card space-y-5 animate-slide-up border-brand-200 dark:border-brand-800">
            {/* Row 1: Category */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Tag size={14} className="text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Category</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  active={!filters.categoryId}
                  onClick={() => { setFilters(f => ({ ...f, categoryId: '' })); load({ categoryId: '' }) }}
                  color="slate"
                />
                {categories.map(c => (
                  <FilterChip
                    key={c.id}
                    label={c.name}
                    active={String(filters.categoryId) === String(c.id)}
                    onClick={() => { toggle('categoryId', String(c.id)); load({ categoryId: filters.categoryId === String(c.id) ? '' : String(c.id) }) }}
                    color="brand"
                  />
                ))}
              </div>
            </div>

            {/* Row 2: Type */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Layers size={14} className="text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(t => (
                  <FilterChip
                    key={t.value}
                    label={t.label}
                    active={filters.type === t.value}
                    onClick={() => { toggle('type', t.value); load({ type: filters.type === t.value ? '' : t.value }) }}
                    color={t.color}
                  />
                ))}
              </div>
            </div>

            {/* Row 3: Condition */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Star size={14} className="text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Condition</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <FilterChip
                    key={c.value}
                    label={c.label}
                    active={filters.condition === c.value}
                    onClick={() => { toggle('condition', c.value); load({ condition: filters.condition === c.value ? '' : c.value }) }}
                    color={c.color}
                  />
                ))}
              </div>
            </div>

            {/* Row 4: Price */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <DollarSign size={14} className="text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Price Range</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Presets */}
                {PRICE_PRESETS.map(p => (
                  <FilterChip
                    key={p.label}
                    label={p.label}
                    active={priceMin === p.min && priceMax === p.max}
                    onClick={() => applyPricePreset(p)}
                    color="slate"
                  />
                ))}
                {/* Manual inputs */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min ₹"
                    value={priceMin}
                    onChange={e => setPriceMin(e.target.value)}
                    className="w-24 py-1.5 px-2.5 text-sm"
                  />
                  <span className="text-slate-400 text-sm">–</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max ₹"
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value)}
                    className="w-24 py-1.5 px-2.5 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Apply / Reset */}
            <div className="flex gap-2 pt-1 justify-end border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={clearAll} className="btn-secondary text-sm">
                Reset all
              </button>
              <button
                type="button"
                onClick={() => { load(); setShowAdvanced(false) }}
                className="btn text-sm gap-1.5"
              >
                <RefreshCw size={13} />
                Apply filters
              </button>
            </div>
          </div>
        )}

        {/* Grid / List */}
        {loading ? (
          <div className={viewMode === 'list'
            ? 'space-y-3'
            : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No listings found"
            description="Try adjusting your filters or be the first to list something!"
            action={user
              ? <Link to="/create" className="btn">Create a listing</Link>
              : <Link to="/register" className="btn">Get started</Link>
            }
          />
        ) : viewMode === 'list' ? (
          /* ── List view ── */
          <div className="space-y-3">
            {items.map(item => (
              <ListingCard key={item.id} item={item} user={user} onRequestSuccess={() => load()} listMode />
            ))}
          </div>
        ) : (
          /* ── Grid view ── */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(item => (
              <ListingCard key={item.id} item={item} user={user} onRequestSuccess={() => load()} />
            ))}
          </div>
        )}
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="py-4">
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

      {/* ── Footer CTA (guests only) ────────────────────────────────────── */}
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
