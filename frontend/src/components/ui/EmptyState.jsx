import { PackageOpen } from 'lucide-react'

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description = '',
  action = null,
}) {
  return (
    <div className="animate-in flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-surface/70 px-4 py-12 text-center shadow-sm backdrop-blur sm:px-6 sm:py-16">
      <div className="mb-4 rounded-[24px] bg-gradient-to-br from-primary-soft to-surface-elevated p-4 text-primary ring-1 ring-primary/10 sm:p-5">
        <Icon size={32} className="sm:h-9 sm:w-9" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted sm:text-[15px]">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}
