import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Repeat,
  ShoppingCart,
  Star,
  Tag,
  User,
  X,
  ZoomIn,
} from 'lucide-react'
import { listingApi, orderApi } from '../api/services'
import { StatusBadge } from './ui/Badge'

const TYPE_CONFIG = {
  SELL: { icon: Tag, label: 'For Sale', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  RENT: { icon: Clock, label: 'For Rent', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  EXCHANGE: { icon: Repeat, label: 'Exchange', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
}

function formatPrice(value) {
  const amount = Number(value || 0)
  return amount.toLocaleString('en-IN')
}

function initials(value) {
  if (!value) return 'S'
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

function Toast({ type, message, onDismiss }) {
  return (
    <div
      className={`fixed bottom-24 xl:bottom-6 right-4 z-[60] flex max-w-xs items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl animate-slide-up ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle size={16} className="flex-shrink-0" />
      ) : (
        <AlertCircle size={16} className="flex-shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="flex-shrink-0 opacity-80 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

function ImageGallery({ images, title, compact = false }) {
  const [index, setIndex] = useState(0)
  const list = images?.length ? images : []
  const current = list[index] || null

  useEffect(() => {
    setIndex(0)
  }, [images])

  const prev = e => {
    e.stopPropagation()
    setIndex(currentIndex => (currentIndex - 1 + list.length) % list.length)
  }

  const next = e => {
    e.stopPropagation()
    setIndex(currentIndex => (currentIndex + 1) % list.length)
  }

  const height = compact ? 'h-48' : 'h-72 sm:h-80'

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${height} rounded-t-2xl`}>
      {current ? (
        <img src={current} alt={title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          <div className="rounded-2xl bg-slate-200 p-5 dark:bg-slate-700">
            <ShoppingCart size={28} className="text-slate-400 dark:text-slate-500" />
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">No image</span>
        </div>
      )}

      {list.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Previous image"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Next image"
          >
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={e => {
                  e.stopPropagation()
                  setIndex(i)
                }}
                className={`rounded-full transition-all ${
                  i === index ? 'h-1.5 w-4 bg-white' : 'h-1.5 w-1.5 bg-white/50'
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RelatedCard({ item, onClick }) {
  const image = item.imageUrls?.[0] || null
  const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.SELL
  const TypeIcon = typeConf.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative h-28 overflow-hidden bg-slate-100 dark:bg-slate-800">
        {image ? (
          <img
            src={image}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingCart size={22} className="text-slate-400 dark:text-slate-500" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeConf.bg} ${typeConf.color}`}>
            <TypeIcon size={9} />
            {typeConf.label}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
          {item.title}
        </h4>
        <div className="text-sm font-bold text-brand-600 dark:text-brand-400">
          Rs. {formatPrice(item.price)}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate">{item.category || 'Marketplace'}</span>
          <ArrowRight size={12} className="flex-shrink-0" />
        </div>
      </div>
    </button>
  )
}

function ProductModal({ item, user, onClose, onRequestSuccess }) {
  const [requesting, setRequesting] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeItem, setActiveItem] = useState(item)
  const [similarItems, setSimilarItems] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  const typeConf = TYPE_CONFIG[activeItem.type] || TYPE_CONFIG.SELL
  const TypeIcon = typeConf.icon

  useEffect(() => {
    setActiveItem(item)
  }, [item])

  useEffect(() => {
    let cancelled = false

    const loadSimilar = async () => {
      setLoadingSimilar(true)
      try {
        const params = {
          status: 'ACTIVE',
          page: 0,
          size: 8,
        }

        if (activeItem.categoryId) params.categoryId = activeItem.categoryId
        if (activeItem.type) params.type = activeItem.type

        const price = Number(activeItem.price || 0)
        if (Number.isFinite(price) && price > 0) {
          params.minPrice = Math.max(0, (price * 0.75).toFixed(2))
          params.maxPrice = (price * 1.25).toFixed(2)
        }

        const response = await listingApi.search(params)
        const related = (response.data?.content || response.data || []).filter(
          entry => entry.id !== activeItem.id
        )
        if (!cancelled) setSimilarItems(related)
      } catch {
        if (!cancelled) setSimilarItems([])
      } finally {
        if (!cancelled) setLoadingSimilar(false)
      }
    }

    loadSimilar()
    return () => {
      cancelled = true
    }
  }, [activeItem])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRequest = async () => {
    setRequesting(true)
    try {
      await orderApi.create(activeItem.id)
      showToast('success', 'Request sent. The seller will be notified.')
      if (onRequestSuccess) onRequestSuccess()
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Could not send request.')
    } finally {
      setRequesting(false)
    }
  }

  const sellerInitials = useMemo(() => initials(activeItem.seller), [activeItem.seller])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl animate-slide-up dark:border-slate-800 dark:bg-slate-900 sm:max-w-3xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X size={16} />
        </button>

        <ImageGallery images={activeItem.imageUrls} title={activeItem.title} />

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
                Marketplace item
              </p>
              <h2 className="mt-1 text-xl font-bold leading-snug text-slate-900 dark:text-white">
                {activeItem.title}
              </h2>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                Rs. {formatPrice(activeItem.price)}
              </div>
              {activeItem.type === 'RENT' && (
                <div className="text-xs text-slate-400 dark:text-slate-500">per period</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeConf.bg} ${typeConf.color}`}>
              <TypeIcon size={12} />
              {typeConf.label}
            </span>
            {activeItem.status && <StatusBadge status={activeItem.status} />}
            {activeItem.condition && <StatusBadge status={activeItem.condition} />}
            {activeItem.category && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {activeItem.category}
              </span>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {activeItem.description && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Description
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {activeItem.description}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Seller profile
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                      {activeItem.seller || 'Campus seller'}
                    </h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white shadow-sm">
                    {sellerInitials}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Seller ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      #{activeItem.sellerId ?? 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Listed on
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {activeItem.createdAt
                        ? new Date(activeItem.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recently'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Listing status
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={activeItem.status || 'ACTIVE'} />
                    </div>
                  </div>
                </div>

                {activeItem.sellerRating > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-amber-500">
                    <Star size={14} fill="currentColor" />
                    {activeItem.sellerRating.toFixed(1)} seller rating
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick facts</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <User size={14} />
                      Seller
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {activeItem.seller || 'Campus seller'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Tag size={14} />
                      Category
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {activeItem.category || 'Marketplace'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Clock size={14} />
                      Type
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {typeConf.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Similar products
                </h3>
                <div className="mt-3">
                  {loadingSimilar ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30"
                        />
                      ))}
                    </div>
                  ) : similarItems.length ? (
                    <div className="grid grid-cols-2 gap-3">
                      {similarItems.map(related => (
                        <RelatedCard key={related.id} item={related} onClick={() => setActiveItem(related)} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Similar products will appear here when more listings match this item.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-1">
            {user ? (
              <button
                onClick={handleRequest}
                disabled={requesting || activeItem.status !== 'ACTIVE'}
                className="btn flex w-full items-center justify-center gap-2 py-3 text-base font-semibold"
              >
                {requesting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending request...
                  </>
                ) : activeItem.status !== 'ACTIVE' ? (
                  'Not available'
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Request this item
                  </>
                )}
              </button>
            ) : (
              <a href="/login" className="btn flex w-full justify-center py-3 text-base font-semibold">
                Sign in to request
              </a>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  )
}

export default function ListingCard({
  item,
  user,
  onRequestSuccess,
  listMode = false,
  isWishlisted = false,
  isSaved = false,
  onToggleWishlist,
  onToggleSaved,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [toast, setToast] = useState(null)

  const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.SELL
  const TypeIcon = typeConf.icon
  const imageUrl = item.imageUrls?.[0] || null
  const imageCount = item.imageUrls?.length || 0

  const canToggleWishlist = typeof onToggleWishlist === 'function'
  const canToggleSaved = typeof onToggleSaved === 'function'

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2500)
  }

  const handleRequest = async e => {
    e.stopPropagation()
    if (!user) return
    setRequesting(true)
    try {
      await orderApi.create(item.id)
      showToast('success', 'Request sent.')
      if (onRequestSuccess) onRequestSuccess()
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Could not send request.')
    } finally {
      setRequesting(false)
    }
  }

  const handleWishlist = e => {
    e.stopPropagation()
    if (canToggleWishlist) onToggleWishlist(item)
  }

  const handleSaved = e => {
    e.stopPropagation()
    if (canToggleSaved) onToggleSaved(item)
  }

  const statusLabel = useMemo(() => item.status || 'ACTIVE', [item.status])

  return (
    <>
      <article
        className={`group card-hover overflow-hidden p-0 transition-all ${listMode ? 'flex flex-row items-stretch gap-0' : 'flex flex-col'}`}
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setModalOpen(true)}
        aria-label={`View details for ${item.title}`}
      >
        <div
          className={`relative flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 ${
            listMode ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-48'
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingCart size={listMode ? 18 : 28} className="text-slate-400 dark:text-slate-500" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${typeConf.bg} ${typeConf.color}`}>
              <TypeIcon size={11} />
              {typeConf.label}
            </span>
            {!listMode && <StatusBadge status={item.condition} />}
          </div>

          {!listMode && imageCount > 1 && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
              +{imageCount - 1}
            </div>
          )}

          <div className="absolute right-3 top-3 flex gap-2" onClick={e => e.stopPropagation()}>
            {canToggleWishlist && (
              <button
                type="button"
                onClick={handleWishlist}
                className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                  isWishlisted
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'bg-white/90 text-slate-600 hover:bg-white dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            )}
            {canToggleSaved && (
              <button
                type="button"
                onClick={handleSaved}
                className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                  isSaved
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'bg-white/90 text-slate-600 hover:bg-white dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                aria-label={isSaved ? 'Remove from saved listings' : 'Save listing'}
                title={isSaved ? 'Remove from saved listings' : 'Save listing'}
              >
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
          </div>

          {!listMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/10">
              <div className="rounded-full bg-white/90 p-2 opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 dark:bg-slate-900/90">
                <ZoomIn size={16} className="text-slate-700 dark:text-slate-200" />
              </div>
            </div>
          )}
        </div>

        <div className={`flex min-w-0 flex-1 flex-col ${listMode ? 'p-3 sm:p-4' : 'p-4'}`}>
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3
              className={`flex-1 font-semibold leading-snug text-slate-900 dark:text-slate-100 ${
                listMode ? 'text-sm' : 'line-clamp-1 text-sm'
              }`}
            >
              {item.title}
            </h3>
            <span className="whitespace-nowrap text-sm font-bold text-brand-600 dark:text-brand-400">
              Rs. {formatPrice(item.price)}
            </span>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            <StatusBadge status={statusLabel} />
            {listMode && item.condition && <StatusBadge status={item.condition} />}
          </div>

          {item.category && (
            <p className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">{item.category}</p>
          )}

          {!listMode && item.description && (
            <p className="mb-2.5 line-clamp-2 flex-1 text-xs text-slate-500 dark:text-slate-400">
              {item.description}
            </p>
          )}

          {item.seller && (
            <p className="mb-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <User size={11} />
              {item.seller}
            </p>
          )}

          <div className={`mt-auto flex items-center gap-2 ${listMode ? 'flex-wrap' : ''}`} onClick={e => e.stopPropagation()}>
            {user ? (
              <button
                onClick={handleRequest}
                disabled={requesting || item.status !== 'ACTIVE'}
                className={`btn text-xs py-2 ${listMode ? 'flex-1 justify-center' : 'flex-1'}`}
              >
                {requesting ? (
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Requesting...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <ShoppingCart size={13} />
                    {item.status !== 'ACTIVE' ? 'Unavailable' : 'Request'}
                  </span>
                )}
              </button>
            ) : (
              !listMode && (
                <span className="flex-1 py-2 text-center text-xs italic text-slate-400 dark:text-slate-500">
                  Sign in to request
                </span>
              )
            )}

            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setModalOpen(true)
              }}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-400"
            >
              Details
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </article>

      {modalOpen && (
        <ProductModal
          item={item}
          user={user}
          onClose={() => setModalOpen(false)}
          onRequestSuccess={onRequestSuccess}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
    </>
  )
}
