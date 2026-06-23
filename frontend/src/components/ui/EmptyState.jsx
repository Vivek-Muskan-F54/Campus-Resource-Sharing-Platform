import { PackageOpen } from 'lucide-react'

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description = '',
  action = null,
}) {
  return (
    <div className="animate-in flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-surface/70 px-6 py-16 text-center shadow-sm backdrop-blur">
      <div className="mb-4 rounded-[24px] bg-gradient-to-br from-primary-soft to-surface-elevated p-5 text-primary ring-1 ring-primary/10">
        <Icon size={36} />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
