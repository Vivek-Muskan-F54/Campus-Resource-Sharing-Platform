import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Heart,
  LayoutGrid,
  List,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from 'lucide-react'
import { categoryApi, listingApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import ListingCard from '../components/ListingCard'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 12
const WISHLIST_KEY = 'campusshare_marketplace_wishlist'
const SAVED_KEY = 'campusshare_marketplace_saved'
const RECENT_SEARCH_KEY = 'campusshare_marketplace_recent_searches'

const TYPE_OPTIONS = [
  { value: 'SELL', label: 'For sale' },
  { value: 'RENT', label: 'For rent' },
  { value: 'EXCHANGE', label: 'Exchange' },
]

const CONDITION_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
]

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first', icon: Clock },
  { value: 'price,asc', label: 'Price: low to high', icon: TrendingUp },
  { value: 'price,desc', label: 'Price: high to low', icon: TrendingUp },
  { value: 'createdAt,asc', label: 'Oldest first', icon: Clock },
]

const PRICE_PRESETS = [
  { label: 'Under Rs. 1k', minPrice: '', maxPrice: '1000' },
  { label: 'Rs. 1k - 5k', minPrice: '1000', maxPrice: '5000' },
  { label: 'Rs. 5k - 10k', minPrice: '5000', maxPrice: '10000' },
  { label: 'Above Rs. 10k', minPrice: '10000', maxPrice: '' },
]

function readIdSet(key) {
  if (typeof window === 'undefined') return new Set()
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return new Set((Array.isArray(value) ? value : []).map(String))
  } catch {
    return new Set()
  }
}

function writeIdSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

function readRecentSearches() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]')
    return Array.isArray(value) ? value.filter(Boolean).slice(0, 6) : []
  } catch {
    return []
  }
}

function writeRecentSearches(list) {
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list.slice(0, 6)))
}

function formatPrice(value) {
  const amount = Number(value || 0)
  return amount.toLocaleString('en-IN')
}

function countActiveFilters(filters) {
  return [
    filters.q,
    filters.categoryId,
    filters.type,
    filters.condition,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-700 dark:hover:text-brand-400'
      }`}
    >
      {label}
    </button>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null

  const pages = []
  const start = Math.max(0, Math.min(page - 1, totalPages - 3))
  const end = Math.min(totalPages, start + 3)

  for (let index = start; index < end; index += 1) {
    pages.push(index)
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <ChevronLeft size={14} />
        Prev
      </button>
      {start > 0 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(0)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            1
          </button>
          <span className="px-1 text-slate-400">...</span>
        </>
      )}
      {pages.map(index => (
        <button
          key={index}
          type="button"
          onClick={() => onPageChange(index)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            index === page
              ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          {index + 1}
        </button>
      ))}
      {end < totalPages && (
        <>
          <span className="px-1 text-slate-400">...</span>
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

export default function Marketplace() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savedLoading, setSavedLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [savedListings, setSavedListings] = useState([])
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 })
  const [viewMode, setViewMode] = useState('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt,desc')
  const [page, setPage] = useState(0)
  const [wishlistIds, setWishlistIds] = useState(() => readIdSet(WISHLIST_KEY))
  const [savedIds, setSavedIds] = useState(() => readIdSet(SAVED_KEY))
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches())
  const [filters, setFilters] = useState({
    q: '',
    categoryId: '',
    type: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
  })

  const debouncedQuery = useDebounce(filters.q, 350)

  useEffect(() => {
    let cancelled = false

    const loadCategories = async () => {
      try {
        const response = await categoryApi.all()
        if (cancelled) return
        const list = response.data?.content || response.data || []
        setCategories(list)
      } catch {
        if (!cancelled) setCategories([])
      }
    }

    loadCategories()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = event => {
      if (event.key === WISHLIST_KEY) setWishlistIds(readIdSet(WISHLIST_KEY))
      if (event.key === SAVED_KEY) setSavedIds(readIdSet(SAVED_KEY))
      if (event.key === RECENT_SEARCH_KEY) setRecentSearches(readRecentSearches())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true)
      setError('')
      try {
        const params = {
          page,
          size: PAGE_SIZE,
          sort: sortBy,
        }

        const query = debouncedQuery.trim()
        if (query) params.q = query
        if (filters.categoryId) params.categoryId = filters.categoryId
        if (filters.type) params.type = filters.type
        if (filters.condition) params.condition = filters.condition
        if (filters.minPrice) params.minPrice = filters.minPrice
        if (filters.maxPrice) params.maxPrice = filters.maxPrice

        const response = await listingApi.search(params)
        const data = response.data || {}
        const content = data.content || data || []

        setItems(content)
        setMeta({
          totalPages: data.totalPages ?? 0,
          totalElements: data.totalElements ?? content.length,
        })
      } catch (err) {
        setItems([])
        setMeta({ totalPages: 0, totalElements: 0 })
        setError(err?.response?.data?.message || 'Could not load marketplace listings.')
      } finally {
        setLoading(false)
      }
    }

    loadListings()
  }, [
    debouncedQuery,
    filters.categoryId,
    filters.condition,
    filters.maxPrice,
    filters.minPrice,
    filters.type,
    page,
    sortBy,
  ])

  useEffect(() => {
    const loadSavedListings = async () => {
      const ids = [...savedIds].map(Number).filter(Number.isFinite)

      if (!ids.length) {
        setSavedListings([])
        setSavedLoading(false)
        return
      }

      setSavedLoading(true)
      try {
        const responses = await Promise.all(
          ids.map(id =>
            listingApi
              .getById(id)
              .then(response => response.data)
              .catch(() => null)
          )
        )
        setSavedListings(responses.filter(Boolean))
      } finally {
        setSavedLoading(false)
      }
    }

    loadSavedListings()
  }, [savedIds])

  const updateFilter = (key, value) => {
    setPage(0)
    setFilters(current => ({ ...current, [key]: value }))
  }

  const applyPreset = preset => {
    setPage(0)
    setFilters(current => ({
      ...current,
      minPrice: preset.minPrice,
      maxPrice: preset.maxPrice,
    }))
  }

  const clearFilters = () => {
    setPage(0)
    setSortBy('createdAt,desc')
    setFilters({
      q: '',
      categoryId: '',
      type: '',
      condition: '',
      minPrice: '',
      maxPrice: '',
    })
  }

  const toggleWishlist = item => {
    setWishlistIds(current => {
      const next = new Set(current)
      const key = String(item.id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      writeIdSet(WISHLIST_KEY, next)
      return next
    })
  }

  const toggleSaved = item => {
    setSavedIds(current => {
      const next = new Set(current)
      const key = String(item.id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      writeIdSet(SAVED_KEY, next)
      return next
    })
  }

  const saveSearch = query => {
    const trimmed = query.trim()
    if (!trimmed) return

    const next = [trimmed, ...recentSearches.filter(entry => entry.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6)
    setRecentSearches(next)
    writeRecentSearches(next)
  }

  const handleSearchSubmit = event => {
    event.preventDefault()
    saveSearch(filters.q)
    setPage(0)
  }

  const activeFilterCount = countActiveFilters(filters)
  const totalWishlist = wishlistIds.size
  const totalSaved = savedIds.size

  const totalResults = meta.totalElements || 0

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 px-5 py-8 text-white shadow-2xl shadow-slate-900/20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute -left-16 top-0 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <Sparkles size={12} />
              Modern campus marketplace
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                Buy, rent, or exchange campus essentials in one polished marketplace.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                Search faster, save items for later, compare similar products, and move through listings with a cleaner browsing experience.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filters.q}
                    onChange={e => updateFilter('q', e.target.value)}
                    placeholder="Search products, categories, or sellers"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-white/30 focus:bg-white/15"
                  />
                </label>

                <button type="submit" className="btn h-12 gap-2 rounded-2xl px-5">
                  <Search size={16} />
                  Search
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(open => !open)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur transition-colors hover:bg-white/10"
                >
                  <SlidersHorizontal size={12} />
                  Advanced filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {recentSearches.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      updateFilter('q', term)
                      saveSearch(term)
                    }}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Listings</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold">{totalResults}</div>
                <PackageSearch size={22} className="text-white/55" />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Saved</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold">{totalSaved}</div>
                <Bookmark size={22} className="text-white/55" />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Wishlist</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold">{totalWishlist}</div>
                <Heart size={22} className="text-white/55" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved listings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Quickly revisit items you bookmarked for later.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{totalSaved} saved</Badge>
            <Badge variant="red">{totalWishlist} wishlisted</Badge>
          </div>
        </div>

        {savedLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="min-w-[300px] w-[300px]">
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : savedListings.length ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {savedListings.map(item => (
              <div key={item.id} className="min-w-[300px] w-[300px] flex-shrink-0">
                <ListingCard
                  item={item}
                  user={user}
                  listMode
                  isWishlisted={wishlistIds.has(String(item.id))}
                  isSaved={savedIds.has(String(item.id))}
                  onToggleWishlist={toggleWishlist}
                  onToggleSaved={toggleSaved}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={BookmarkCheck}
              title="No saved listings yet"
              description="Use the bookmark action on any product card to build a shortlist here."
              action={
                <button type="button" onClick={() => setFiltersOpen(true)} className="btn gap-2">
                  <Filter size={14} />
                  Open filters
                </button>
              }
            />
          </div>
        )}
      </section>

      <section className="card space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Browse listings</h2>
              <Badge variant="slate">{totalResults} total</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filter by category, type, condition, or price. Results update instantly as you refine the search.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <LayoutGrid size={14} />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <List size={14} />
              List
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(open => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <RefreshCw size={14} />
              Reset
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Advanced filters</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Narrow down listings without losing the browsing flow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Category</span>
                <select
                  value={filters.categoryId}
                  onChange={e => updateFilter('categoryId', e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">All categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Type</span>
                <select
                  value={filters.type}
                  onChange={e => updateFilter('type', e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">All types</option>
                  {TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Condition</span>
                <select
                  value={filters.condition}
                  onChange={e => updateFilter('condition', e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Any condition</option>
                  {CONDITION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Min price</span>
                <input
                  value={filters.minPrice}
                  onChange={e => updateFilter('minPrice', e.target.value)}
                  inputMode="numeric"
                  placeholder="0"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Max price</span>
                <input
                  value={filters.maxPrice}
                  onChange={e => updateFilter('maxPrice', e.target.value)}
                  inputMode="numeric"
                  placeholder="No limit"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Price presets
              </span>
              {PRICE_PRESETS.map(preset => {
                const active = filters.minPrice === preset.minPrice && filters.maxPrice === preset.maxPrice
                return (
                  <FilterChip
                    key={preset.label}
                    label={preset.label}
                    active={active}
                    onClick={() => applyPreset(preset)}
                  />
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Active filters
              </span>
              {filters.q && (
                <Badge variant="brand" className="gap-1.5">
                  Query: {filters.q}
                </Badge>
              )}
              {filters.categoryId && (
                <Badge variant="blue">
                  Category #{filters.categoryId}
                </Badge>
              )}
              {filters.type && <Badge variant="emerald">{filters.type}</Badge>}
              {filters.condition && <Badge variant="amber">{filters.condition}</Badge>}
              {filters.minPrice && <Badge variant="slate">Min Rs. {filters.minPrice}</Badge>}
              {filters.maxPrice && <Badge variant="slate">Max Rs. {filters.maxPrice}</Badge>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Star size={14} className="text-amber-500" />
            Showing {items.length} of {totalResults} listings
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SORT_OPTIONS.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPage(0)
                    setSortBy(option.value)
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    sortBy === option.value
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Icon size={11} />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="card">
            <EmptyState
              icon={PackageSearch}
              title="Marketplace unavailable"
              description={error}
              action={
                <button type="button" onClick={clearFilters} className="btn gap-2">
                  <RefreshCw size={14} />
                  Try again
                </button>
              }
            />
          </div>
        ) : items.length ? (
          <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
            {items.map(item => (
              <ListingCard
                key={item.id}
                item={item}
                user={user}
                listMode={viewMode === 'list'}
                isWishlisted={wishlistIds.has(String(item.id))}
                isSaved={savedIds.has(String(item.id))}
                onToggleWishlist={toggleWishlist}
                onToggleSaved={toggleSaved}
                onRequestSuccess={() => {
                  setPage(0)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={PackageSearch}
              title="No listings matched your search"
              description="Try widening the price range, switching categories, or clearing the filters."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button type="button" onClick={clearFilters} className="btn gap-2">
                    <RefreshCw size={14} />
                    Clear filters
                  </button>
                  <Link to="/create" className="btn btn-secondary gap-2">
                    List an item
                    <ArrowRight size={14} />
                  </Link>
                </div>
              }
            />
          </div>
        )}

        <div className="pt-2">
          <Pagination page={page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
        </div>
      </section>
    </div>
  )
}
