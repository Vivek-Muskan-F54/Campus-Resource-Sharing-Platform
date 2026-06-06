import { PackageOpen } from 'lucide-react'

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description = '',
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-in">
      <div className="mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 p-5">
        <Icon size={36} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
