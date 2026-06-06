const variants = {
  brand: 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  red: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
}

export default function Badge({ children, variant = 'slate', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.slate} ${className}`}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    ACTIVE: { label: 'Active', variant: 'emerald' },
    RESERVED: { label: 'Reserved', variant: 'amber' },
    COMPLETED: { label: 'Completed', variant: 'brand' },
    REJECTED: { label: 'Rejected', variant: 'red' },
    DELETED: { label: 'Deleted', variant: 'slate' },
    REQUESTED: { label: 'Requested', variant: 'blue' },
    APPROVED: { label: 'Approved', variant: 'emerald' },
    READY_FOR_HANDOVER: { label: 'Ready', variant: 'amber' },
    CANCELLED: { label: 'Cancelled', variant: 'slate' },
    PENDING: { label: 'Pending', variant: 'amber' },
    SELL: { label: 'For Sale', variant: 'emerald' },
    RENT: { label: 'For Rent', variant: 'blue' },
    EXCHANGE: { label: 'Exchange', variant: 'purple' },
    NEW: { label: 'New', variant: 'emerald' },
    LIKE_NEW: { label: 'Like New', variant: 'emerald' },
    GOOD: { label: 'Good', variant: 'brand' },
    FAIR: { label: 'Fair', variant: 'amber' },
    POOR: { label: 'Poor', variant: 'red' },
  }
  const config = map[status] || { label: status, variant: 'slate' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
