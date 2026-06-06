import { useState } from 'react'
import { ShoppingCart, Eye, Tag, Repeat, Clock } from 'lucide-react'
import { orderApi } from '../api/services'
import { StatusBadge } from './ui/Badge'

const conditionLabel = { NEW: 'New', LIKE_NEW: 'Like New', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor' }
const typeIcon = { SELL: Tag, RENT: Clock, EXCHANGE: Repeat }

export default function ListingCard({ item, user, onRequestSuccess }) {
  const [requesting, setRequesting] = useState(false)
  const TypeIcon = typeIcon[item.type] || Tag

  const handleRequest = async e => {
    e.stopPropagation()
    if (!user) return
    setRequesting(true)
    try {
      await orderApi.create(item.id)
      if (onRequestSuccess) onRequestSuccess()
      else alert('Request sent successfully!')
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not send request. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  const imageUrl = item.imageUrls?.[0] || null

  return (
    <article className="group card-hover overflow-hidden p-0 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800 h-48">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
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

        {/* Type badge overlay */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold shadow-sm">
            <TypeIcon size={11} className="text-brand-600 dark:text-brand-400" />
            <span className="text-slate-700 dark:text-slate-200">{item.type}</span>
          </span>
        </div>

        {/* Condition badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={item.condition} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 text-sm leading-snug flex-1">
            {item.title}
          </h3>
          <span className="font-bold text-brand-600 dark:text-brand-400 text-sm whitespace-nowrap">
            ₹{Number(item.price).toLocaleString('en-IN')}
          </span>
        </div>

        {item.category && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{item.category}</p>
        )}

        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 flex-1 mb-3">
            {item.description}
          </p>
        )}

        {item.sellerName && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            by <span className="text-slate-600 dark:text-slate-300">{item.sellerName}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          {user ? (
            <button
              onClick={handleRequest}
              disabled={requesting || item.status !== 'ACTIVE'}
              className="btn flex-1 text-xs py-2"
            >
              {requesting ? (
                <span className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Requesting...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ShoppingCart size={13} />
                  Request
                </span>
              )}
            </button>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic flex-1 text-center py-2">
              Sign in to request
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
