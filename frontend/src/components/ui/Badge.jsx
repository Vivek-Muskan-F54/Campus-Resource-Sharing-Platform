const variants = {
  brand: 'bg-primary-soft text-primary ring-1 ring-primary/12',
  emerald: 'bg-success-soft text-success ring-1 ring-success/12',
  amber: 'bg-warning-soft text-warning ring-1 ring-warning/12',
  red: 'bg-danger-soft text-danger ring-1 ring-danger/12',
  slate: 'bg-surface-elevated text-muted ring-1 ring-border',
  purple: 'bg-info-soft text-info ring-1 ring-info/12',
  blue: 'bg-info-soft text-info ring-1 ring-info/12',
}

export default function Badge({ children, variant = 'slate', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant] || variants.slate} ${className}`}
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
    VERIFIED: { label: 'Verified', variant: 'emerald' },
    BLOCKED: { label: 'Blocked', variant: 'red' },
  }
  const config = map[status] || { label: status, variant: 'slate' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
