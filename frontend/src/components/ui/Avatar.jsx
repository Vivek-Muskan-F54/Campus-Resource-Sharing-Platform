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
    'bg-primary-soft text-primary ring-1 ring-primary/12',
    'bg-success-soft text-success ring-1 ring-success/12',
    'bg-info-soft text-info ring-1 ring-info/12',
    'bg-warning-soft text-warning ring-1 ring-warning/12',
    'bg-danger-soft text-danger ring-1 ring-danger/12',
    'bg-info-soft text-info ring-1 ring-info/12',
  ]

  const colorIndex = name.charCodeAt(0) % colors.length
  const color = colors[colorIndex] || colors[0]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size] || sizes.md} rounded-full object-cover ring-2 ring-surface shadow-sm ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizes[size] || sizes.md} rounded-full flex items-center justify-center font-semibold flex-shrink-0 shadow-sm ${color} ${className}`}
    >
      {initials || '?'}
    </div>
  )
}
