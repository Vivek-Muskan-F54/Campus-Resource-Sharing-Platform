export default function Avatar({ name = '', src = null, size = 'md', className = '' }) {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-20 w-20 text-2xl',
  }

  const initials = name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = [
    'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ]

  const colorIndex = name.charCodeAt(0) % colors.length
  const color = colors[colorIndex] || colors[0]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size] || sizes.md} rounded-full object-cover ring-2 ring-white dark:ring-slate-800 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizes[size] || sizes.md} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${color} ${className}`}
    >
      {initials || '?'}
    </div>
  )
}
