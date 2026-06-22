import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Hash,
  Loader2,
  Search,
  Star,
  Upload,
  X,
} from 'lucide-react'
import { noteApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

const PAGE_SIZE = 12
const NOTE_BOOKMARK_KEY = 'campusshare_bookmarked_notes'
const NOTE_RATINGS_KEY = 'campusshare_note_ratings'
const NOTE_RECENTS_KEY = 'campusshare_recent_note_searches'

const SEMESTERS = Array.from({ length: 8 }, (_, index) => index + 1)

const POPULAR_BRANCHES = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'AIDS', 'MECH']
const POPULAR_SUBJECTS = [
  'Data Structures',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'OOP',
  'Algorithms',
  'Mathematics',
  'Physics',
]

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first', icon: Clock },
  { value: 'downloadCount,desc', label: 'Most downloaded', icon: Download },
  { value: 'createdAt,asc', label: 'Oldest first', icon: Clock },
]

function readSet(key) {
  if (typeof window === 'undefined') return new Set()
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return new Set((Array.isArray(parsed) ? parsed : []).map(String))
  } catch {
    return new Set()
  }
}

function writeSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

function readRatings() {
  if (typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTE_RATINGS_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeRatings(next) {
  localStorage.setItem(NOTE_RATINGS_KEY, JSON.stringify(next))
}

function readRecentSearches() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTE_RECENTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : []
  } catch {
    return []
  }
}

function writeRecentSearches(next) {
  localStorage.setItem(NOTE_RECENTS_KEY, JSON.stringify(next.slice(0, 6)))
}

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

function normalize(value) {
  return String(value || '').trim()
}

function filterCount(filters) {
  return [filters.q, filters.branch, filters.subject, filters.semester].filter(Boolean).length
}

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-400'
      }`}
    >
      {label}
    </button>
  )
}

function RatingStars({ value = 0, onChange, readonly = false, size = 16 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1
        const filled = value >= starValue
        return (
          <button
            key={starValue}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            className={`transition-colors ${readonly ? 'cursor-default' : 'hover:scale-110'}`}
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={filled ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}
              fill={filled ? 'currentColor' : 'none'}
            />
          </button>
        )
      })}
    </div>
  )
}

function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null

  const pages = []
  const start = Math.max(0, Math.min(page - 1, totalPages - 3))
  const end = Math.min(totalPages, start + 3)
  for (let index = start; index < end; index += 1) pages.push(index)

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <ChevronLeft size={14} />
        Prev
      </button>
      {start > 0 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(0)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            1
          </button>
          <span className="px-1 text-slate-400">...</span>
        </>
      )}
      {pages.map(index => (
        <button
          key={index}
          type="button"
          onClick={() => onPageChange(index)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            index === page
              ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          {index + 1}
        </button>
      ))}
      {end < totalPages && (
        <>
          <span className="px-1 text-slate-400">...</span>
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

function PdfPreview({ note, onClose, onToggleBookmark, bookmarked, rating, onRate, onDownload, downloading }) {
  const previewUrl = note ? noteApi.previewUrl(note.id) : ''

  useEffect(() => {
    if (note) {
      console.debug('[Notes] PDF preview URL', { noteId: note.id, previewUrl })
    }
  }, [note, previewUrl])

  return (
    <Modal open={!!note} onClose={onClose} title={note ? note.title : 'Preview note'} size="xl">
      {note && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
              {previewUrl ? (
                <iframe
                  title={note.title}
                  src={previewUrl}
                  className="h-[70vh] w-full"
                />
              ) : (
                <div className="flex h-[70vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Preview unavailable for this note.
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onDownload} disabled={downloading} className="btn gap-2">
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => onToggleBookmark(note.id)}
                className={`btn-secondary gap-2 ${bookmarked ? 'border-brand-300 text-brand-700 dark:border-brand-700 dark:text-brand-300' : ''}`}
              >
                {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                {bookmarked ? 'Saved' : 'Save note'}
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary gap-2"
              >
                <ArrowRight size={14} />
                Open in new tab
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                    Note details
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {note.title}
                  </h3>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
                  <FileText size={20} className="text-red-500 dark:text-red-400" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Branch</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{note.branch}</p>
                </div>
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Semester</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">Sem {note.semester}</p>
                </div>
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Subject</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{note.subject}</p>
                </div>
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Downloads</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {note.downloadCount ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white p-3 dark:bg-slate-900">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Your rating</p>
                  <div className="mt-1">
                    <RatingStars value={rating || 0} onChange={onRate} />
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                  <p>{note.originalFilename || 'PDF document'}</p>
                  {note.fileSize ? <p className="mt-1">{formatFileSize(note.fileSize)}</p> : null}
                </div>
              </div>
            </div>

            {note.uploaderName && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Uploaded by
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {note.uploaderName}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function NoteCard({ note, bookmarked, rating, onToggleBookmark, onOpenPreview, onRate, onDownload }) {
  const fileSize = formatFileSize(note.fileSize)
  const createdAt = formatDate(note.createdAt)
  const downloadCount = note.downloadCount ?? 0

  return (
    <article
      className="group card overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer"
      onClick={() => onOpenPreview(note)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpenPreview(note)}
    >
      <div className="flex w-full flex-col text-left">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
              <FileText size={22} className="text-red-500 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                {note.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-400 hover:text-brand-600 dark:bg-slate-900 dark:hover:text-brand-400'
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
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Download size={12} />
              <span>{downloadCount} downloads</span>
            </div>
            <div className="flex items-center gap-1">
              <RatingStars value={rating || 0} readonly size={14} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Preview</p>
              <p className="mt-1 truncate font-medium text-slate-700 dark:text-slate-300">PDF ready</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">File size</p>
              <p className="mt-1 truncate font-medium text-slate-700 dark:text-slate-300">
                {fileSize || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="truncate">{createdAt || 'Recently added'}</span>
            <span className="inline-flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400">
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

function LoadingSkeletons() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="card overflow-hidden p-0 animate-pulse">
          <div className="h-40 bg-slate-100 dark:bg-slate-800" />
          <div className="space-y-3 p-4">
            <div className="skeleton h-4 w-3/4 rounded-lg" />
            <div className="skeleton h-3 w-1/2 rounded-lg" />
            <div className="flex gap-1.5">
              <div className="skeleton h-5 w-14 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="skeleton h-14 rounded-xl" />
              <div className="skeleton h-14 rounded-xl" />
            </div>
            <div className="skeleton h-9 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Notes() {
  const { user } = useAuth()

  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showBookmarked, setShowBookmarked] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt,desc')
  const [sortOpen, setSortOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [bookmarked, setBookmarked] = useState(() => readSet(NOTE_BOOKMARK_KEY))
  const [ratings, setRatings] = useState(() => readRatings())
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches())
  const [previewNote, setPreviewNote] = useState(null)
  const [downloadingNoteId, setDownloadingNoteId] = useState(null)
  const [savedNotes, setSavedNotes] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)

  const [filters, setFilters] = useState({
    q: '',
    branch: '',
    subject: '',
    semester: '',
  })

  const [uploadForm, setUploadForm] = useState({
    title: '',
    branch: '',
    semester: 1,
    subject: '',
  })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState({ type: '', text: '' })

  const debouncedQuery = useDebounce(filters.q, 350)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = event => {
      if (event.key === NOTE_BOOKMARK_KEY) setBookmarked(readSet(NOTE_BOOKMARK_KEY))
      if (event.key === NOTE_RATINGS_KEY) setRatings(readRatings())
      if (event.key === NOTE_RECENTS_KEY) setRecentSearches(readRecentSearches())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true)
      setError('')
      try {
        const params = {
          page,
          size: PAGE_SIZE,
          sort: sortBy,
        }

        const q = normalize(debouncedQuery)
        if (q) params.q = q
        if (filters.branch) params.branch = filters.branch
        if (filters.subject) params.subject = filters.subject
        if (filters.semester) params.semester = Number(filters.semester)

        const response = await noteApi.all(params)
        const data = response.data || {}
        const content = data.content || data || []
        setNotes(content)
        setTotalPages(data.totalPages ?? 0)
        setTotalElements(data.totalElements ?? content.length)
      } catch (err) {
        setNotes([])
        setTotalPages(0)
        setTotalElements(0)
        setError(err?.response?.data?.message || 'Could not load notes right now.')
      } finally {
        setLoading(false)
      }
    }

    loadNotes()
  }, [debouncedQuery, filters.branch, filters.semester, filters.subject, page, sortBy])

  useEffect(() => {
    const loadSavedNotes = async () => {
      const ids = [...bookmarked].map(Number).filter(Number.isFinite)

      if (!ids.length) {
        setSavedNotes([])
        setSavedLoading(false)
        return
      }

      setSavedLoading(true)
      try {
        const results = await Promise.all(
          ids.map(id =>
            noteApi
              .getById(id)
              .then(response => response.data)
              .catch(() => null)
          )
        )
        setSavedNotes(results.filter(Boolean))
      } finally {
        setSavedLoading(false)
      }
    }

    loadSavedNotes()
  }, [bookmarked])

  const activeCount = filterCount(filters)
  const bookmarkedCount = bookmarked.size

  const filteredNotes = useMemo(() => {
    return showBookmarked ? savedNotes : notes
  }, [notes, savedNotes, showBookmarked])

  const currentSort = SORT_OPTIONS.find(option => option.value === sortBy) || SORT_OPTIONS[0]

  const updateFilter = (key, value) => {
    setPage(0)
    setFilters(current => ({ ...current, [key]: value }))
  }

  const toggleBookmark = id => {
    setBookmarked(current => {
      const next = new Set(current)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      writeSet(NOTE_BOOKMARK_KEY, next)
      return next
    })
  }

  const setRating = (noteId, rating) => {
    setRatings(current => {
      const next = { ...current, [noteId]: rating }
      writeRatings(next)
      return next
    })
  }

  const saveSearch = query => {
    const value = normalize(query)
    if (!value) return
    const next = [value, ...recentSearches.filter(entry => entry.toLowerCase() !== value.toLowerCase())].slice(0, 6)
    setRecentSearches(next)
    writeRecentSearches(next)
  }

  const handleSearchSubmit = event => {
    event.preventDefault()
    saveSearch(filters.q)
    setPage(0)
  }

  const clearFilters = () => {
    setPage(0)
    setFilters({ q: '', branch: '', subject: '', semester: '' })
    setSortBy('createdAt,desc')
    setShowFilters(false)
  }

  const handleDownload = async note => {
    setDownloadingNoteId(note.id)
    try {
      window.open(noteApi.downloadUrl(note.id), '_blank', 'noopener,noreferrer')
      setNotes(current =>
        current.map(item =>
          item.id === note.id ? { ...item, downloadCount: (item.downloadCount || 0) + 1 } : item
        )
      )
      if (previewNote?.id === note.id) {
        setPreviewNote(current => (current ? { ...current, downloadCount: (current.downloadCount || 0) + 1 } : current))
      }
    } finally {
      setTimeout(() => setDownloadingNoteId(null), 500)
    }
  }

  const uploadNote = async event => {
    event.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadMsg({ type: '', text: '' })
    try {
      const form = new FormData()
      form.append('title', uploadForm.title)
      form.append('branch', uploadForm.branch)
      form.append('semester', uploadForm.semester)
      form.append('subject', uploadForm.subject)
      form.append('file', file)
      await noteApi.upload(form)
      setUploadMsg({
        type: 'success',
        text: 'Your note was submitted for review and will appear once approved.',
      })
      setUploadForm({ title: '', branch: '', semester: 1, subject: '' })
      setFile(null)
      event.target.reset()
    } catch (err) {
      setUploadMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Upload failed. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  const noteCards = filteredNotes.length
  const totalSaved = bookmarkedCount

  return (
    <div className="space-y-8 animate-in">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 px-5 py-8 text-white shadow-2xl shadow-slate-900/20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute -left-12 top-0 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute right-0 top-8 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <GraduationCap size={12} />
              Study notes library
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                Find, preview, bookmark, and rate study notes with a cleaner campus experience.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                Browse notes by branch, subject, and semester. Download count, bookmarking, and note previews are built right into the workflow.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search title, subject, or branch"
                    value={filters.q}
                    onChange={e => updateFilter('q', e.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-white/30 focus:bg-white/15"
                    aria-label="Search notes"
                  />
                </label>
                <button type="submit" className="btn h-12 gap-2 rounded-2xl px-5">
                  <Search size={16} />
                  Search
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(v => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur transition-colors hover:bg-white/10"
                >
                  <Filter size={12} />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {activeCount}
                    </span>
                  )}
                </button>

                {recentSearches.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      updateFilter('q', term)
                      saveSearch(term)
                    }}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Notes</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold">{totalElements}</div>
                <BookOpen size={22} className="text-white/55" />
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Saved</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold">{totalSaved}</div>
                <Bookmark size={22} className="text-white/55" />
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Downloads shown</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold">{notes.reduce((sum, note) => sum + (note.downloadCount || 0), 0)}</div>
                <Download size={22} className="text-white/55" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved notes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bookmarked notes stay close for quick revisits and downloads.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBookmarked(v => !v)}
            className={`btn-secondary gap-2 ${showBookmarked ? 'border-brand-300 text-brand-700 dark:border-brand-700 dark:text-brand-300' : ''}`}
          >
            {showBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {showBookmarked ? 'Showing saved' : 'Show saved only'}
          </button>
        </div>

        {savedLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="min-w-[290px] w-[290px] flex-shrink-0">
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : savedNotes.length ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {savedNotes.map(note => (
              <div key={note.id} className="min-w-[290px] w-[290px] flex-shrink-0">
                <NoteCard
                  note={note}
                  bookmarked={bookmarked.has(String(note.id))}
                  rating={ratings[note.id] || 0}
                  onToggleBookmark={toggleBookmark}
                  onOpenPreview={setPreviewNote}
                  onRate={rating => setRating(note.id, rating)}
                  onDownload={handleDownload}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={BookmarkCheck}
              title="No saved notes yet"
              description="Bookmark a note to keep it in a quick-access saved section."
              action={
                <button type="button" onClick={() => setShowFilters(true)} className="btn gap-2">
                  <Filter size={14} />
                  Browse notes
                </button>
              }
            />
          </div>
        )}
      </section>

      <section className="card space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Browse notes</h2>
              <Badge variant="brand">{noteCards} shown</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Search by title, subject, branch, or semester. Preview PDFs before downloading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen(v => !v)}
                className="btn-secondary gap-2"
              >
                <currentSort.icon size={14} />
                {currentSort.label}
                <ChevronDown size={12} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 min-w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  {SORT_OPTIONS.map(option => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortBy(option.value)
                          setPage(0)
                          setSortOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                          option.value === sortBy ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon size={13} />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setShowFilters(v => !v)} className="btn-secondary gap-2">
              <Filter size={14} />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </button>

            <button type="button" onClick={clearFilters} className="btn-secondary gap-2">
              <X size={14} />
              Reset
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Use chips for quick narrowing across branches, subjects, and semesters.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Branch</p>
                <div className="flex flex-wrap gap-2">
                  <Chip label="All" active={!filters.branch} onClick={() => updateFilter('branch', '')} />
                  {POPULAR_BRANCHES.map(branch => (
                    <Chip
                      key={branch}
                      label={branch}
                      active={filters.branch === branch}
                      onClick={() => updateFilter('branch', filters.branch === branch ? '' : branch)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Subject</p>
                <div className="flex flex-wrap gap-2">
                  <Chip label="All" active={!filters.subject} onClick={() => updateFilter('subject', '')} />
                  {POPULAR_SUBJECTS.map(subject => (
                    <Chip
                      key={subject}
                      label={subject}
                      active={filters.subject === subject}
                      onClick={() => updateFilter('subject', filters.subject === subject ? '' : subject)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Semester</p>
                <div className="flex flex-wrap gap-2">
                  <Chip label="All" active={!filters.semester} onClick={() => updateFilter('semester', '')} />
                  {SEMESTERS.map(semester => (
                    <Chip
                      key={semester}
                      label={`Sem ${semester}`}
                      active={String(filters.semester) === String(semester)}
                      onClick={() =>
                        updateFilter(
                          'semester',
                          String(filters.semester) === String(semester) ? '' : String(semester)
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject search</span>
                  <input
                    value={filters.subject}
                    onChange={e => updateFilter('subject', e.target.value)}
                    placeholder="Type a subject"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Semester search</span>
                  <select
                    value={filters.semester}
                    onChange={e => updateFilter('semester', e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">All semesters</option>
                    {SEMESTERS.map(semester => (
                      <option key={semester} value={semester}>
                        Semester {semester}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Quick searches
                </span>
                {recentSearches.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => updateFilter('q', term)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button type="button" onClick={clearFilters} className="btn-secondary text-sm">
                  Reset
                </button>
                <button type="button" onClick={() => setShowFilters(false)} className="btn text-sm">
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.q && (
              <Badge variant="brand" className="gap-1.5">
                Search: {filters.q}
                <button onClick={() => updateFilter('q', '')} type="button">
                  <X size={11} />
                </button>
              </Badge>
            )}
            {filters.branch && (
              <Badge variant="emerald" className="gap-1.5">
                Branch: {filters.branch}
                <button onClick={() => updateFilter('branch', '')} type="button">
                  <X size={11} />
                </button>
              </Badge>
            )}
            {filters.subject && (
              <Badge variant="purple" className="gap-1.5">
                Subject: {filters.subject}
                <button onClick={() => updateFilter('subject', '')} type="button">
                  <X size={11} />
                </button>
              </Badge>
            )}
            {filters.semester && (
              <Badge variant="slate" className="gap-1.5">
                Semester: {filters.semester}
                <button onClick={() => updateFilter('semester', '')} type="button">
                  <X size={11} />
                </button>
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Star size={14} className="text-amber-500" />
            Showing {noteCards} of {totalElements} notes
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Eye size={12} />
            Preview before downloading
          </div>
        </div>

        {loading ? (
          <LoadingSkeletons />
        ) : error ? (
          <div className="card">
            <EmptyState
              icon={AlertCircle}
              title="Notes are unavailable"
              description={error}
              action={
                <button type="button" onClick={clearFilters} className="btn gap-2">
                  <X size={14} />
                  Try again
                </button>
              }
            />
          </div>
        ) : filteredNotes.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                bookmarked={bookmarked.has(String(note.id))}
                rating={ratings[note.id] || 0}
                onToggleBookmark={toggleBookmark}
                onOpenPreview={setPreviewNote}
                onRate={rating => setRating(note.id, rating)}
                onDownload={handleDownload}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title={showBookmarked ? 'No saved notes yet' : activeCount > 0 ? 'No notes match your filters' : 'No notes yet'}
            description={
              showBookmarked
                ? 'Save notes you like to keep them in your personal quick-access list.'
                : activeCount > 0
                  ? 'Try widening your subject, semester, or branch filters.'
                  : 'Be the first to share study material for your classmates.'
            }
            action={
              showBookmarked ? (
                <button type="button" onClick={() => setShowBookmarked(false)} className="btn-secondary gap-2">
                  <BookOpen size={14} />
                  Browse all notes
                </button>
              ) : activeCount > 0 ? (
                <button type="button" onClick={clearFilters} className="btn-secondary gap-2">
                  <X size={14} />
                  Clear filters
                </button>
              ) : user ? (
                <button type="button" onClick={() => setShowUpload(true)} className="btn gap-2">
                  <Upload size={14} />
                  Upload first note
                </button>
              ) : null
            }
          />
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      <Modal
        open={showUpload}
        onClose={() => {
          setShowUpload(false)
          setUploadMsg({ type: '', text: '' })
        }}
        title="Upload Study Notes"
        size="lg"
      >
        <form onSubmit={uploadNote} className="space-y-5">
          {uploadMsg.text && (
            <div
              className={
                uploadMsg.type === 'success'
                  ? 'alert-success flex items-start gap-2'
                  : 'alert-error flex items-start gap-2'
              }
            >
              {uploadMsg.type === 'success' ? (
                <Badge variant="emerald">Success</Badge>
              ) : (
                <Badge variant="red">Error</Badge>
              )}
              <span className="text-sm">{uploadMsg.text}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-group sm:col-span-2">
              <label className="label" htmlFor="note-title">
                Title *
              </label>
              <input
                id="note-title"
                placeholder="e.g. Data Structures Unit 3 Notes"
                required
                value={uploadForm.title}
                onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                className="w-full"
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="note-branch">
                Branch *
              </label>
              <input
                id="note-branch"
                list="branch-suggestions"
                placeholder="e.g. CSE"
                required
                value={uploadForm.branch}
                onChange={e => setUploadForm(f => ({ ...f, branch: e.target.value }))}
                className="w-full"
              />
              <datalist id="branch-suggestions">
                {POPULAR_BRANCHES.map(branch => (
                  <option key={branch} value={branch} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="note-subject">
                Subject *
              </label>
              <input
                id="note-subject"
                list="subject-suggestions"
                placeholder="e.g. Data Structures"
                required
                value={uploadForm.subject}
                onChange={e => setUploadForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full"
              />
              <datalist id="subject-suggestions">
                {POPULAR_SUBJECTS.map(subject => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
            </div>

            <div className="form-group sm:col-span-2">
              <label className="label" htmlFor="note-semester">
                Semester *
              </label>
              <div className="flex flex-wrap gap-2">
                {SEMESTERS.map(semester => (
                  <button
                    key={semester}
                    type="button"
                    onClick={() => setUploadForm(f => ({ ...f, semester }))}
                    className={`h-9 rounded-xl border px-3 text-sm font-medium transition-all ${
                      uploadForm.semester === semester
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Sem {semester}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group sm:col-span-2">
              <label className="label" htmlFor="note-file">
                PDF File *
              </label>
              <label
                htmlFor="note-file"
                className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 transition-all ${
                  file
                    ? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20'
                    : 'border-slate-300 hover:border-brand-400 dark:border-slate-700 dark:hover:border-brand-600'
                }`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                  <FileText size={16} className="text-red-500 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  {file ? (
                    <span className="block truncate font-medium text-brand-600 dark:text-brand-400">{file.name}</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Click to select a PDF file</span>
                  )}
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      setFile(null)
                    }}
                    className="text-slate-400 transition-colors hover:text-red-500"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <input
                id="note-file"
                type="file"
                accept="application/pdf"
                required={!file}
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="sr-only"
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Your note will be reviewed by admins before it appears publicly.
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowUpload(false)
                setUploadMsg({ type: '', text: '' })
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="btn gap-1.5">
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Submit for review
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <PdfPreview
        note={previewNote}
        onClose={() => setPreviewNote(null)}
        onToggleBookmark={toggleBookmark}
        bookmarked={previewNote ? bookmarked.has(String(previewNote.id)) : false}
        rating={previewNote ? ratings[previewNote.id] || 0 : 0}
        onRate={rating => previewNote && setRating(previewNote.id, rating)}
        onDownload={previewNote ? () => handleDownload(previewNote) : undefined}
        downloading={previewNote ? downloadingNoteId === previewNote.id : false}
      />
    </div>
  )
}
