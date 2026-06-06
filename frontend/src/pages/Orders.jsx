import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, QrCode, CheckCircle, XCircle, Clock,
  ChevronRight, Truck, ShoppingBag, RefreshCw
} from 'lucide-react'
import { orderApi } from '../api/services'
import { StatusBadge } from '../components/ui/Badge'
import { SkeletonRow } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'

const STATUS_STEPS = {
  REQUESTED: 0,
  APPROVED: 1,
  READY_FOR_HANDOVER: 2,
  COMPLETED: 3,
}

function OrderProgress({ status }) {
  const steps = ['Requested', 'Approved', 'Ready', 'Completed']
  const current = STATUS_STEPS[status] ?? 0

  return (
    <div className="flex items-center gap-0 mt-3 mb-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < current
                  ? 'bg-emerald-500 text-white'
                  : i === current
                  ? 'bg-brand-600 text-white ring-2 ring-brand-200 dark:ring-brand-800'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] mt-1 font-medium whitespace-nowrap ${
              i === current ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
            }`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 transition-all ${
              i < current ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [qrUrls, setQrUrls] = useState({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await orderApi.mine()
      setOrders(res.data?.content || [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const objectUrls = []
    const readyOrders = orders.filter(o => o.status === 'READY_FOR_HANDOVER')
    if (!readyOrders.length) { setQrUrls({}); return }

    Promise.allSettled(
      readyOrders.map(async order => {
        const res = await orderApi.qr(order.id)
        const url = URL.createObjectURL(res.data)
        objectUrls.push(url)
        return [order.id, url]
      })
    ).then(results => {
      setQrUrls(
        Object.fromEntries(
          results.filter(r => r.status === 'fulfilled').map(r => r.value)
        )
      )
    })

    return () => objectUrls.forEach(url => URL.revokeObjectURL(url))
  }, [orders])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await orderApi.status(id, status)
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not update order.')
    } finally {
      setUpdating(null)
    }
  }

  const statusConfig = {
    REQUESTED: { label: 'Approve', action: 'APPROVED', class: 'btn' },
    APPROVED: { label: 'Mark Ready', action: 'READY_FOR_HANDOVER', class: 'btn-emerald' },
  }

  return (
    <div className="space-y-7 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="text-brand-600 dark:text-brand-400" />
            Orders
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track your buying and selling activity.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="btn-secondary gap-1.5"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/qr-verify" className="btn gap-1.5">
            <QrCode size={15} />
            <span className="hidden sm:inline">Verify QR</span>
            <span className="sm:hidden">QR</span>
          </Link>
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="When you request a listing or someone requests yours, it'll appear here."
          action={<Link to="/" className="btn">Browse marketplace</Link>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const config = statusConfig[order.status]
            const isUpdating = updating === order.id
            const image = order.product?.imageUrls?.[0]

            return (
              <div key={order.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start gap-4">
                  {/* Product image */}
                  <div className="h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {image ? (
                      <img src={image} alt={order.product?.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package size={20} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {order.product?.title || 'Unknown Product'}
                      </h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      <p>Order #{order.id}</p>
                      {order.buyerName && <p>Buyer: <span className="text-slate-600 dark:text-slate-300">{order.buyerName}</span></p>}
                      {order.sellerName && <p>Seller: <span className="text-slate-600 dark:text-slate-300">{order.sellerName}</span></p>}
                    </div>

                    {/* Progress */}
                    {!['CANCELLED', 'REJECTED'].includes(order.status) && (
                      <OrderProgress status={order.status} />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {config && (
                      <button
                        className={`${config.class} text-sm`}
                        disabled={isUpdating}
                        onClick={() => updateStatus(order.id, config.action)}
                      >
                        {isUpdating ? (
                          <span className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Updating...
                          </span>
                        ) : config.label}
                      </button>
                    )}

                    {order.status === 'READY_FOR_HANDOVER' && qrUrls[order.id] && (
                      <div className="card p-3 text-center border border-dashed border-brand-300 dark:border-brand-700">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center justify-center gap-1">
                          <QrCode size={12} />
                          Scan to complete handover
                        </p>
                        <img
                          alt={`QR for order ${order.id}`}
                          src={qrUrls[order.id]}
                          className="h-32 w-32 mx-auto rounded-lg"
                        />
                      </div>
                    )}

                    {order.status === 'COMPLETED' && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                        <CheckCircle size={16} />
                        Completed
                      </div>
                    )}

                    {order.status === 'REJECTED' && (
                      <div className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
                        <XCircle size={16} />
                        Rejected
                      </div>
                    )}

                    {order.status === 'CANCELLED' && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                        <XCircle size={16} />
                        Cancelled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
