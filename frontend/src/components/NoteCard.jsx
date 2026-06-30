import { memo, useMemo } from 'react'
import { Bookmark, BookmarkCheck, Download, Eye, FileText, Hash, Star } from 'lucide-react'
import Badge from './ui/Badge'

function formatFileSize(value) {
  if (!value) return null
  if (value > 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`
  return `${Math.round(value / 1_000)} KB`
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function RatingStars({ value = 0, size = 14 }) {
  const stars = useMemo(
    () => Array.from({ length: 5 }).map((_, index) => index + 1),
    []
  )

  return (
    <div className="flex items-center gap-1">
      {stars.map(starValue => {
        const filled = value >= starValue
        return (
          <Star
            key={starValue}
            size={size}
            className={filled ? 'text-warning' : 'text-border-strong'}
            fill={filled ? 'currentColor' : 'none'}
          />
        )
      })}
    </div>
  )
}

function NoteCard({
  note,
  bookmarked = false,
  rating = 0,
  onToggleBookmark = () => {},
  onOpenPreview = () => {},
  onDownload = () => {},
}) {
  const fileSize = formatFileSize(note.fileSize)
  const createdAt = formatDate(note.createdAt)
  const downloadCount = note.downloadCount ?? 0

  return (
    <article
      className="group card overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer"
      onClick={() => onOpenPreview(note)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenPreview(note)
        }
      }}
      aria-label={`Open preview for ${note.title}`}
    >
      <div className="flex w-full flex-col text-left">
        <div className="relative overflow-hidden bg-surface-elevated p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm ring-1 ring-border">
              <FileText size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {note.title}
              </h3>
              <p className="mt-1 text-xs text-muted">
                by {note.uploaderName || 'Anonymous'}
              </p>
            </div>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onToggleBookmark(note.id)
              }}
              className={`rounded-xl p-2 transition-all ${
                bookmarked
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface text-muted hover:text-primary'
              }`}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this note'}
              title={bookmarked ? 'Remove bookmark' : 'Save for later'}
            >
              {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.branch && <Badge variant="brand">{note.branch}</Badge>}
            {note.subject && <Badge variant="purple">{note.subject}</Badge>}
            {note.semester && (
              <Badge variant="slate">
                <Hash size={9} className="mr-0.5" />
                Sem {note.semester}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Download size={12} />
              <span>{downloadCount} downloads</span>
            </div>
            <RatingStars value={rating} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
            <div className="rounded-2xl bg-surface-elevated px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted">Preview</p>
              <p className="mt-1 truncate font-medium text-foreground">PDF ready</p>
            </div>
            <div className="rounded-2xl bg-surface-elevated px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted">File size</p>
              <p className="mt-1 truncate font-medium text-foreground">
                {fileSize || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
            <span className="truncate">{createdAt || 'Recently added'}</span>
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              Preview note
              <Eye size={12} />
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={() => onOpenPreview(note)}
          className="btn-secondary flex-1 gap-2"
        >
          <Eye size={14} />
          Preview
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onDownload(note)
          }}
          className="btn flex-1 gap-2"
        >
          <Download size={14} />
          Download
        </button>
      </div>
    </article>
  )
}

export default memo(NoteCard)
