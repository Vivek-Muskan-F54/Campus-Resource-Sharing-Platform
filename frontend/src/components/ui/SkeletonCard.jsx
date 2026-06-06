export function SkeletonCard() {
  return (
    <div className="card overflow-hidden p-0 animate-pulse">
      <div className="skeleton h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4 rounded-lg" />
        <div className="skeleton h-3 w-1/2 rounded-lg" />
        <div className="skeleton h-3 w-full rounded-lg" />
        <div className="skeleton h-3 w-4/5 rounded-lg" />
        <div className="flex justify-between mt-4">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="card flex items-center gap-4 animate-pulse">
      <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/3 rounded-lg" />
        <div className="skeleton h-3 w-1/2 rounded-lg" />
      </div>
      <div className="skeleton h-8 w-20 rounded-xl" />
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
      <div className="skeleton h-7 w-16 rounded-lg" />
      <div className="skeleton h-3 w-24 rounded-lg" />
    </div>
  )
}
