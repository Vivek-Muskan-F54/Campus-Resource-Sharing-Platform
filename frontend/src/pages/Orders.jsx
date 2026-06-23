import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  QrCode,
  CheckCircle,
  XCircle,
  ChevronRight,
  ShoppingBag,
  RefreshCw,
  Truck,
  ArrowRight,
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
    <div className="mt-4 flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                i < current
                  ? 'bg-success text-white'
                  : i === current
                    ? 'bg-primary text-white ring-2 ring-primary-soft'
                    : 'bg-surface-elevated text-muted ring-1 ring-border'
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span
              className={`mt-1 text-[9px] font-medium whitespace-nowrap ${
                i === current ? 'text-primary' : 'text-muted'
              }`}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-1 h-0.5 flex-1 transition-all ${i < current ? 'bg-success' : 'bg-border'}`} />
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

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const objectUrls = []
    const readyOrders = orders.filter(o => o.status === 'READY_FOR_HANDOVER')
    if (!readyOrders.length) {
      setQrUrls({})
      return
    }

    Promise.allSettled(
      readyOrders.map(async order => {
        const res = await orderApi.qr(order.id)
        const url = URL.createObjectURL(res.data)
        objectUrls.push(url)
        return [order.id, url]
      })
    ).then(results => {
      setQrUrls(
        Object.fromEntries(results.filter(r => r.status === 'fulfilled').map(r => r.value))
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
    <div className="space-y-6 animate-in">
      <div className="hero-panel">
        <div className="px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="hero-kicker">
                <Package size={11} />
                Orders
              </div>
              <div>
                <h1 className="hero-title">Orders</h1>
                <p className="hero-copy mt-2 max-w-2xl">
                  Track your buying and selling activity with a cleaner, executive-style workflow.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={load} className="btn-secondary gap-1.5">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <Link to="/qr-verify" className="btn gap-1.5">
                <QrCode size={15} />
                Verify QR
              </Link>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="When you request a listing or someone requests yours, it will appear here."
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
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {image ? (
                      <img src={image} alt={order.product?.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={20} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {order.product?.title || 'Unknown Product'}
                      </h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <p>Order #{order.id}</p>
                      {order.buyerName && (
                        <p>
                          Buyer: <span className="text-slate-600 dark:text-slate-300">{order.buyerName}</span>
                        </p>
                      )}
                      {order.sellerName && (
                        <p>
                          Seller: <span className="text-slate-600 dark:text-slate-300">{order.sellerName}</span>
                        </p>
                      )}
                    </div>

                    {!['CANCELLED', 'REJECTED'].includes(order.status) && (
                      <OrderProgress status={order.status} />
                    )}
                  </div>

                  <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
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
                        ) : (
                          config.label
                        )}
                      </button>
                    )}

                    {order.status === 'READY_FOR_HANDOVER' && qrUrls[order.id] && (
                      <div className="rounded-3xl border border-dashed border-brand-300 bg-brand-50 p-3 text-center dark:border-brand-700 dark:bg-brand-900/20">
                        <p className="mb-2 flex items-center justify-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                          <QrCode size={12} />
                          Scan to complete handover
                        </p>
                        <img
                          alt={`QR for order ${order.id}`}
                          src={qrUrls[order.id]}
                          className="mx-auto h-32 w-32 rounded-2xl"
                        />
                      </div>
                    )}

                    {order.status === 'COMPLETED' && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle size={16} />
                        Completed
                      </div>
                    )}

                    {order.status === 'REJECTED' && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                        <XCircle size={16} />
                        Rejected
                      </div>
                    )}

                    {order.status === 'CANCELLED' && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
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
