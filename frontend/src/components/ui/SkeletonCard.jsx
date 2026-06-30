export function SkeletonCard() {
  return (
    <div className="card overflow-hidden p-0 animate-pulse">
      <div className="skeleton h-36 w-full rounded-none sm:h-44" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-4/5 rounded-full" />
        <div className="mt-4 flex justify-between">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="card flex flex-col items-start gap-4 sm:flex-row sm:items-center animate-pulse">
      <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="skeleton h-4 w-1/3 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
      </div>
      <div className="skeleton h-8 w-full rounded-2xl sm:w-20" />
    </div>
  )
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 rounded-lg"
          style={{ width: `${100 - (i % 3) * 15}%` }}
        />
      ))}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="skeleton h-8 w-8 rounded-lg" />
      <div className="skeleton h-7 w-16 rounded-full" />
      <div className="skeleton h-3 w-24 rounded-full" />
    </div>
  )
}
