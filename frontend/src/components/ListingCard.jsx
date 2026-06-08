import { useState } from 'react'
import {
  ShoppingCart, Tag, Repeat, Clock, User,
  ChevronLeft, ChevronRight, X, MapPin,
  Star, CheckCircle, AlertCircle, ZoomIn
} from 'lucide-react'
import { orderApi } from '../api/services'
import { StatusBadge } from './ui/Badge'

const TYPE_CONFIG = {
  SELL:     { icon: Tag,    label: 'For Sale',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  RENT:     { icon: Clock,  label: 'For Rent',  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/30' },
  EXCHANGE: { icon: Repeat, label: 'Exchange',  color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ type, message, onDismiss }) {
  return (
    <div className={`fixed bottom-24 xl:bottom-6 right-4 z-[60] flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl text-sm font-medium animate-slide-up max-w-xs ${
      type === 'success'
        ? 'bg-emerald-600 text-white'
        : 'bg-red-600 text-white'
    }`}>
      {type === 'success'
        ? <CheckCircle size={16} className="flex-shrink-0" />
        : <AlertCircle size={16} className="flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="flex-shrink-0 opacity-80 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Image gallery ─────────────────────────────────────────────────────────────
function ImageGallery({ images, title, compact = false }) {
  const [idx, setIdx] = useState(0)
  const list = images?.length ? images : []
  const current = list[idx] || null

  const prev = e => { e.stopPropagation(); setIdx(i => (i - 1 + list.length) % list.length) }
  const next = e => { e.stopPropagation(); setIdx(i => (i + 1) % list.length) }

  const height = compact ? 'h-48' : 'h-72 sm:h-80'

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${height} rounded-t-2xl`}>
      {current ? (
        <img
          src={current}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center gap-2">
          <div className="rounded-2xl bg-slate-200 dark:bg-slate-700 p-5">
            <ShoppingCart size={28} className="text-slate-400 dark:text-slate-500" />
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">No image</span>
        </div>
      )}

      {/* Arrow nav — only show when there are multiple images */}
      {list.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight size={14} />
          </button>
          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
                className={`rounded-full transition-all ${i === idx ? 'h-1.5 w-4 bg-white' : 'h-1.5 w-1.5 bg-white/50'}`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Product detail modal ──────────────────────────────────────────────────────
function ProductModal({ item, user, onClose, onRequestSuccess }) {
  const [requesting, setRequesting] = useState(false)
  const [toast, setToast] = useState(null)
  const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.SELL
  const TypeIcon = typeConf.icon

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRequest = async () => {
    setRequesting(true)
    try {
      await orderApi.create(item.id)
      showToast('success', 'Request sent! The seller will be notified.')
      if (onRequestSuccess) onRequestSuccess()
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Could not send request.')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <X size={16} />
        </button>

        {/* Image gallery */}
        <ImageGallery images={item.imageUrls} title={item.title} />

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Title + price row */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {item.title}
            </h2>
            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                ₹{Number(item.price).toLocaleString('en-IN')}
              </div>
              {item.type === 'RENT' && (
                <div className="text-xs text-slate-400 dark:text-slate-500">per period</div>
              )}
            </div>
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeConf.bg} ${typeConf.color}`}>
              <TypeIcon size={12} />
              {typeConf.label}
            </span>
            <StatusBadge status={item.condition} />
            {item.category && (
              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                {item.category}
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          )}

          {/* Seller info */}
          {item.sellerName && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.sellerName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Seller</p>
              </div>
              {item.sellerRating > 0 && (
                <div className="flex items-center gap-1 text-amber-500 text-sm font-semibold">
                  <Star size={14} fill="currentColor" />
                  {item.sellerRating?.toFixed(1)}
                </div>
              )}
            </div>
          )}

          {/* Action */}
          <div className="pt-1">
            {user ? (
              <button
                onClick={handleRequest}
                disabled={requesting || item.status !== 'ACTIVE'}
                className="btn w-full py-3 text-base font-semibold gap-2"
              >
                {requesting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending request…
                  </>
                ) : item.status !== 'ACTIVE' ? (
                  'Not available'
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Request this item
                  </>
                )}
              </button>
            ) : (
              <a href="/login" className="btn w-full py-3 text-base font-semibold justify-center">
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

// ─── Listing card (grid tile) ──────────────────────────────────────────────────
export default function ListingCard({ item, user, onRequestSuccess, listMode = false }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [toast, setToast] = useState(null)
  const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.SELL
  const TypeIcon = typeConf.icon

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const handleRequest = async e => {
    e.stopPropagation()
    if (!user) return
    setRequesting(true)
    try {
      await orderApi.create(item.id)
      showToast('success', 'Request sent!')
      if (onRequestSuccess) onRequestSuccess()
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Could not send request.')
    } finally {
      setRequesting(false)
    }
  }

  const imageUrl = item.imageUrls?.[0] || null

  return (
    <>
      <article
        className={`group card-hover overflow-hidden p-0 cursor-pointer ${
          listMode
            ? 'flex flex-row items-center gap-0'
            : 'flex flex-col'
        }`}
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setModalOpen(true)}
        aria-label={`View details for ${item.title}`}
      >
        {/* Image */}
        <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 ${
          listMode ? 'h-24 w-24 sm:h-28 sm:w-28 rounded-none' : 'h-48 rounded-none'
        }`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2">
              <ShoppingCart size={listMode ? 18 : 28} className="text-slate-400 dark:text-slate-500" />
            </div>
          )}

          {!listMode && (
            <>
              {/* Zoom hint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 dark:bg-slate-900/90 rounded-full p-2 shadow-lg">
                  <ZoomIn size={16} className="text-slate-700 dark:text-slate-200" />
                </div>
              </div>
              {/* Type badge */}
              <div className="absolute top-3 left-3">
                <span className={`inline-flex items-center gap-1 rounded-full ${typeConf.bg} backdrop-blur-sm px-2.5 py-1 text-xs font-semibold shadow-sm ${typeConf.color}`}>
                  <TypeIcon size={11} />
                  {typeConf.label}
                </span>
              </div>
              {/* Condition badge */}
              <div className="absolute top-3 right-3">
                <StatusBadge status={item.condition} />
              </div>
              {/* Multiple images indicator */}
              {item.imageUrls?.length > 1 && (
                <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                  +{item.imageUrls.length - 1}
                </div>
              )}
            </>
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col flex-1 min-w-0 ${listMode ? 'p-3 sm:p-4' : 'p-4'}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold text-slate-900 dark:text-slate-100 ${listMode ? 'text-sm' : 'line-clamp-1 text-sm'} leading-snug flex-1`}>
              {item.title}
            </h3>
            <span className="font-bold text-brand-600 dark:text-brand-400 text-sm whitespace-nowrap">
              ₹{Number(item.price).toLocaleString('en-IN')}
            </span>
          </div>

          {listMode && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeConf.bg} ${typeConf.color}`}>
                <TypeIcon size={9} />{typeConf.label}
              </span>
              <StatusBadge status={item.condition} />
            </div>
          )}

          {item.category && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{item.category}</p>
          )}

          {!listMode && item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 flex-1 mb-2.5">
              {item.description}
            </p>
          )}

          {item.sellerName && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
              <User size={11} />
              {item.sellerName}
            </p>
          )}

          {/* Action */}
          <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
            {user ? (
              <button
                onClick={handleRequest}
                disabled={requesting || item.status !== 'ACTIVE'}
                className={`btn text-xs py-2 ${listMode ? '' : 'flex-1'}`}
              >
                {requesting ? (
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Requesting…
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
                <span className="text-xs text-slate-400 dark:text-slate-500 italic flex-1 text-center py-2">
                  Sign in to request
                </span>
              )
            )}
          </div>
        </div>
      </article>

      {/* Detail modal */}
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
