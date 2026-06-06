import { useEffect, useState } from 'react'
import {
  Users, Package, FileText, ShieldCheck, MessageCircle,
  LayoutDashboard, Ban, CheckCircle2, XCircle, Trash2,
  TrendingUp, Eye, AlertCircle, RefreshCw, UserCheck,
  Activity
} from 'lucide-react'
import { adminApi } from '../api/services'
import Avatar from '../components/ui/Avatar'
import Badge, { StatusBadge } from '../components/ui/Badge'
import { SkeletonStat, SkeletonRow } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'verifications', label: 'Verifications', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'notes', label: 'Notes', icon: FileText },
]

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`rounded-2xl p-3 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value ?? 0}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [verifications, setVerifications] = useState([])
  const [products, setProducts] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [idCardModal, setIdCardModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [dash, userPage, verPage, prodPage, notePage] = await Promise.all([
        adminApi.dashboard(),
        adminApi.users(),
        adminApi.verifications({ status: 'PENDING' }),
        adminApi.products({ status: 'ACTIVE' }),
        adminApi.notes({ status: 'PENDING' }),
      ])
      setStats(dash.data)
      setUsers(userPage.data?.content || [])
      setVerifications(verPage.data?.content || [])
      setProducts(prodPage.data?.content || [])
      setNotes(notePage.data?.content || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const act = async (fn, id) => {
    setActionLoading(id)
    try {
      await fn()
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Action failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    await act(
      () => adminApi.rejectVerification(rejectModal.id, rejectRemarks || 'ID card is unclear'),
      rejectModal.id
    )
    setRejectModal(null)
    setRejectRemarks('')
  }

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-brand-600' },
        { label: 'Active Users', value: stats.activeUsers, icon: UserCheck, color: 'bg-emerald-600' },
        { label: 'Blocked Users', value: stats.blockedUsers, icon: Ban, color: 'bg-red-500' },
        { label: 'Pending Verifications', value: stats.pendingVerifications, icon: ShieldCheck, color: 'bg-amber-500' },
        { label: 'Verified Students', value: stats.verifiedStudents, icon: CheckCircle2, color: 'bg-emerald-600' },
        { label: 'Active Products', value: stats.activeProducts, icon: Package, color: 'bg-purple-600' },
        { label: 'Approved Notes', value: stats.approvedNotes, icon: FileText, color: 'bg-indigo-600' },
        { label: 'Total Messages', value: stats.totalMessages, icon: MessageCircle, color: 'bg-blue-600' },
      ]
    : []

  return (
    <div className="space-y-7 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <LayoutDashboard className="text-brand-600 dark:text-brand-400" />
            Admin Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Moderate students, products, notes, and account access.
          </p>
        </div>
        <button
          onClick={load}
          className="btn-secondary gap-1.5"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 pb-0">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              tab === t.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <t.icon size={15} />
            {t.label}
            {t.id === 'verifications' && verifications.length > 0 && !loading && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {verifications.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonStat key={i} />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(s => <StatCard key={s.label} {...s} />)}
            </div>
          )}

          {!loading && stats && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card col-span-3 sm:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-amber-500" />
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">Pending Actions</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Verifications</span>
                    <Badge variant={stats.pendingVerifications > 0 ? 'amber' : 'emerald'}>
                      {stats.pendingVerifications}
                    </Badge>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Verifications Tab ───────────────────── */}
      {tab === 'verifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Pending ID Verifications</h2>
            <Badge variant="amber">{verifications.length} pending</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : verifications.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="All clear!"
              description="No pending verifications right now."
            />
          ) : (
            <div className="space-y-3">
              {verifications.map(item => (
                <div key={item.id} className="card">
                  <div className="flex flex-wrap items-start gap-4">
                    <Avatar name={item.studentName || 'U'} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.studentName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.studentEmail}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Submitted: {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.idCardUrl && (
                        <button
                          onClick={() => setIdCardModal(item)}
                          className="btn-secondary gap-1.5 text-sm"
                        >
                          <Eye size={13} />
                          View ID
                        </button>
                      )}
                      <button
                        disabled={actionLoading === item.id}
                        onClick={() => act(
                          () => adminApi.approveVerification(item.id, 'Approved by admin'),
                          item.id
                        )}
                        className="btn-emerald gap-1.5 text-sm"
                      >
                        <CheckCircle2 size={13} />
                        Approve
                      </button>
                      <button
                        disabled={actionLoading === item.id}
                        onClick={() => { setRejectModal(item); setRejectRemarks('') }}
                        className="btn-danger gap-1.5 text-sm"
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Users Tab ───────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">All Users</h2>
            <Badge variant="slate">{users.length} loaded</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No users found" />
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="card">
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar name={u.name || u.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                        <StatusBadge status={u.verificationStatus || 'PENDING'} />
                        {!u.enabled && <Badge variant="red">Blocked</Badge>}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
                      {u.collegeRollNumber && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">Roll: {u.collegeRollNumber}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {u.enabled ? (
                        <button
                          disabled={actionLoading === u.id}
                          onClick={() => act(() => adminApi.blockUser(u.id), u.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                        >
                          <Ban size={13} />
                          Block
                        </button>
                      ) : (
                        <button
                          disabled={actionLoading === u.id}
                          onClick={() => act(() => adminApi.unblockUser(u.id), u.id)}
                          className="btn gap-1.5 text-sm"
                        >
                          <CheckCircle2 size={13} />
                          Unblock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Products Tab ────────────────────────── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Active Products</h2>
            <Badge variant="slate">{products.length} loaded</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : products.length === 0 ? (
            <EmptyState icon={Package} title="No products found" />
          ) : (
            <div className="space-y-3">
              {products.map(p => {
                const image = p.imageUrls?.[0]
                return (
                  <div key={p.id} className="card">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {image ? (
                          <img src={image} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package size={18} className="text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{p.title}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {p.category && <Badge variant="slate">{p.category}</Badge>}
                          {p.type && <StatusBadge status={p.type} />}
                          {p.condition && <StatusBadge status={p.condition} />}
                        </div>
                        {p.seller && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">by {p.seller}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          ₹{Number(p.price || 0).toLocaleString('en-IN')}
                        </span>
                        <button
                          disabled={actionLoading === p.id}
                          onClick={() => {
                            if (window.confirm('Remove this product? This action cannot be undone.')) {
                              act(() => adminApi.removeProduct(p.id), p.id)
                            }
                          }}
                          className="btn-danger gap-1.5 text-sm"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Notes Tab ───────────────────────────── */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Pending Notes</h2>
            <Badge variant="amber">{notes.length} pending</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : notes.length === 0 ? (
            <EmptyState icon={FileText} title="No pending notes" description="All notes have been reviewed." />
          ) : (
            <div className="space-y-3">
              {notes.map(n => (
                <div key={n.id} className="card">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-shrink-0 rounded-xl bg-brand-50 dark:bg-brand-900/30 p-3">
                      <FileText size={18} className="text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{n.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {n.branch && <Badge variant="brand">{n.branch}</Badge>}
                        {n.subject && <Badge variant="purple">{n.subject}</Badge>}
                        {n.semester && <Badge variant="slate">Sem {n.semester}</Badge>}
                      </div>
                      {n.uploaderName && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">by {n.uploaderName}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {n.fileUrl && (
                        <a
                          href={n.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary gap-1.5 text-sm"
                        >
                          <Eye size={13} />
                          View
                        </a>
                      )}
                      <button
                        disabled={actionLoading === n.id}
                        onClick={() => {
                          if (window.confirm('Remove this note? This cannot be undone.')) {
                            act(() => adminApi.removeNote(n.id), n.id)
                          }
                        }}
                        className="btn-danger gap-1.5 text-sm"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectRemarks('') }}
        title="Reject Verification"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Provide a reason for rejection so the student knows how to fix it.
          </p>
          <div className="form-group">
            <label className="label">Rejection reason</label>
            <textarea
              rows={3}
              className="w-full resize-none"
              placeholder="e.g. ID card is blurry, name not visible..."
              value={rejectRemarks}
              onChange={e => setRejectRemarks(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} className="btn-danger gap-2">
              <XCircle size={14} />
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* ID Card modal */}
      <Modal
        open={!!idCardModal}
        onClose={() => setIdCardModal(null)}
        title="ID Card Preview"
        size="lg"
      >
        {idCardModal && (
          <div className="text-center">
            <img
              src={idCardModal.idCardUrl}
              alt="ID Card"
              className="max-h-96 mx-auto rounded-xl object-contain"
            />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {idCardModal.studentName} · {idCardModal.studentEmail}
            </p>
            <a
              href={idCardModal.idCardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary mt-3 text-sm inline-flex gap-1.5"
            >
              <Eye size={13} />
              Open in new tab
            </a>
          </div>
        )}
      </Modal>
    </div>
  )
}
