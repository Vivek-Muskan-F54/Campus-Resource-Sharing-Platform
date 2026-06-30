import { useEffect, useMemo, useRef, useState } from 'react'
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
import { noteApi, recommendationApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { activityTracker } from '../utils/activityTracker'
import NoteCard from '../components/NoteCard'
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
          ? 'border-primary bg-primary text-white shadow-sm'
          : 'border-border bg-surface text-muted hover:border-primary/35 hover:text-primary'
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
            className={`rounded-full p-0.5 transition-all ${readonly ? 'cursor-default' : 'hover:scale-110'}`}
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={filled ? 'text-warning' : 'text-border-strong'}
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
    <div className="pagination-shell">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="pagination-button"
      >
        <ChevronLeft size={14} />
        Prev
      </button>
      {start > 0 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(0)}
            className="pagination-button"
          >
            1
          </button>
          <span className="px-1 text-muted">...</span>
        </>
      )}
      {pages.map(index => (
        <button
          key={index}
          type="button"
          onClick={() => onPageChange(index)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            index === page
              ? 'pagination-button pagination-button-active'
              : 'pagination-button'
          }`}
        >
          {index + 1}
        </button>
      ))}
      {end < totalPages && (
        <>
          <span className="px-1 text-muted">...</span>
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            className="pagination-button"
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="pagination-button"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

function PdfPreview({ note, canUseAuthenticatedPreview, onClose, onToggleBookmark, bookmarked, rating, onRate, onDownload, downloading }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    let revokedUrl = null
    let cancelled = false

    const loadPreview = async () => {
      if (!note) {
        setPreviewUrl('')
        setPreviewError('')
        setPreviewLoading(false)
        return
      }

      setPreviewError('')
      if (!canUseAuthenticatedPreview) {
        setPreviewUrl(noteApi.previewUrl(note.id))
        setPreviewLoading(false)
        return
      }

      setPreviewLoading(true)
      try {
        const response = await noteApi.preview(note.id)
        if (cancelled) return
        const blobUrl = URL.createObjectURL(response.data)
        revokedUrl = blobUrl
        setPreviewUrl(blobUrl)
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error?.response?.data?.message || 'Preview unavailable for this note.')
          setPreviewUrl('')
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }

    loadPreview()

    return () => {
      cancelled = true
      if (revokedUrl) URL.revokeObjectURL(revokedUrl)
    }
  }, [canUseAuthenticatedPreview, note])

  return (
    <Modal open={!!note} onClose={onClose} title={note ? note.title : 'Preview note'} size="xl">
      {note && (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-border bg-surface-elevated shadow-sm">
              {previewLoading ? (
                <div className="flex h-[68vh] items-center justify-center text-sm text-muted sm:h-[72vh] lg:h-[78vh]">
                  Loading preview...
                </div>
              ) : previewUrl ? (
                <iframe
                  title={note.title}
                  src={previewUrl}
                  className="h-[68vh] w-full sm:h-[72vh] lg:h-[78vh]"
                />
              ) : (
                <div className="flex h-[68vh] items-center justify-center text-sm text-muted sm:h-[72vh] lg:h-[78vh]">
                  {previewError || 'Preview unavailable for this note.'}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={onDownload} disabled={downloading} className="btn w-full justify-center gap-2 sm:w-auto">
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => onToggleBookmark(note.id)}
                className={`btn-secondary w-full justify-center gap-2 sm:w-auto ${bookmarked ? 'border-primary bg-primary-soft text-primary' : ''}`}
              >
                {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                {bookmarked ? 'Saved' : 'Save note'}
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary w-full justify-center gap-2 sm:w-auto"
              >
                <ArrowRight size={14} />
                Open in new tab
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Note details
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">
                    {note.title}
                  </h3>
                </div>
                <div className="rounded-2xl bg-primary-soft p-3 text-primary shadow-sm">
                  <FileText size={20} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-elevated p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Branch</p>
                  <p className="mt-1 font-semibold text-foreground">{note.branch}</p>
                </div>
                <div className="rounded-2xl bg-surface-elevated p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Semester</p>
                  <p className="mt-1 font-semibold text-foreground">Sem {note.semester}</p>
                </div>
                <div className="rounded-2xl bg-surface-elevated p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Subject</p>
                  <p className="mt-1 font-semibold text-foreground">{note.subject}</p>
                </div>
                <div className="rounded-2xl bg-surface-elevated p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Downloads</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {note.downloadCount ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-muted">Your rating</p>
                  <div className="mt-1">
                    <RatingStars value={rating || 0} onChange={onRate} />
                  </div>
                </div>
                <div className="text-left text-xs text-muted sm:text-right">
                  <p>{note.originalFilename || 'PDF document'}</p>
                  {note.fileSize ? <p className="mt-1">{formatFileSize(note.fileSize)}</p> : null}
                </div>
              </div>
            </div>

            {note.uploaderName && (
              <div className="rounded-[28px] border border-border bg-surface p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Uploaded by
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
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

function LoadingSkeletons() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="card overflow-hidden p-0 animate-pulse">
          <div className="h-40 bg-surface-elevated" />
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
  const { user, isAuthenticated, isAdmin } = useAuth()

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
  const [recommendedNotes, setRecommendedNotes] = useState([])
  const [recommendedLoading, setRecommendedLoading] = useState(false)
  const lastSearchSignatureRef = useRef('')
  const lastViewedNoteIdRef = useRef(null)

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

        const searchSignature = [q, filters.branch || '', filters.subject || '', filters.semester || ''].join('|')
        if (searchSignature !== '|||') {
          if (searchSignature !== lastSearchSignatureRef.current) {
            lastSearchSignatureRef.current = searchSignature
            void activityTracker.search({
              scope: 'notes',
              query: q || undefined,
              branch: filters.branch || undefined,
              subject: filters.subject || undefined,
              semester: filters.semester ? Number(filters.semester) : undefined,
              page,
              sort: sortBy,
            })
          }
        } else {
          lastSearchSignatureRef.current = ''
        }
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

  useEffect(() => {
    let cancelled = false

    const loadRecommendations = async () => {
      if (!isAuthenticated) {
        setRecommendedNotes([])
        setRecommendedLoading(false)
        return
      }

      setRecommendedLoading(true)
      try {
        const response = await recommendationApi.notes({ page: 0, size: 6, sort: 'createdAt,desc' })
        if (cancelled) return
        setRecommendedNotes(response.data?.content || [])
      } catch {
        if (!cancelled) {
          setRecommendedNotes([])
        }
      } finally {
        if (!cancelled) {
          setRecommendedLoading(false)
        }
      }
    }

    loadRecommendations()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!previewNote || previewNote.id === lastViewedNoteIdRef.current) {
      if (!previewNote) {
        lastViewedNoteIdRef.current = null
      }
      return
    }

    lastViewedNoteIdRef.current = previewNote.id
    void activityTracker.noteViewed(previewNote.id, {
      title: previewNote.title,
      branch: previewNote.branch,
      subject: previewNote.subject,
    })
  }, [previewNote])

  const activeCount = filterCount(filters)
  const bookmarkedCount = bookmarked.size
  const canUseAuthenticatedPreview = !!previewNote
    && previewNote.status !== 'APPROVED'
    && isAuthenticated
    && (isAdmin || String(previewNote.uploaderId) === String(user?.id))

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
      const added = !next.has(key)
      if (added) next.add(key)
      else next.delete(key)
      writeSet(NOTE_BOOKMARK_KEY, next)
      void activityTracker.noteBookmarked(id, {
        action: added ? 'added' : 'removed',
      })
      return next
    })
  }

  const setRating = (noteId, rating) => {
    setRatings(current => {
      const next = { ...current, [noteId]: rating }
      writeRatings(next)
      void activityTracker.noteRated(noteId, { rating })
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
      void activityTracker.noteDownloaded(note.id, {
        title: note.title,
        branch: note.branch,
        subject: note.subject,
      })
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
      const response = await noteApi.upload(form)
      void activityTracker.noteUploaded(response.data?.id, {
        title: uploadForm.title,
        branch: uploadForm.branch,
        subject: uploadForm.subject,
        semester: uploadForm.semester,
      })
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
      <section className="hero-panel px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="hero-kicker">
              <GraduationCap size={12} />
              Study notes library
            </div>

            <div className="space-y-3">
              <h1 className="hero-title max-w-3xl">
                Find, preview, bookmark, and rate study notes with a cleaner campus experience.
              </h1>
              <p className="hero-copy max-w-2xl">
                Browse notes by branch, subject, and semester. Download count, bookmarking, and note previews are built right into the workflow.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="search"
                    placeholder="Search title, subject, or branch"
                    value={filters.q}
                    onChange={e => updateFilter('q', e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted/70 outline-none transition-colors focus:border-primary/30 focus:bg-surface"
                    aria-label="Search notes"
                  />
                </label>
                <button type="submit" className="btn h-12 w-full gap-2 rounded-2xl px-5 sm:w-auto">
                  <Search size={16} />
                  Search
                </button>
                {isAuthenticated && !isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowUpload(true)}
                    className="btn-secondary h-12 w-full gap-2 rounded-2xl px-5 sm:w-auto"
                  >
                    <Upload size={16} />
                    Upload Notes
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(v => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated"
                >
                  <Filter size={12} />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
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
                    className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="hero-metric">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Notes</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-foreground">{totalElements}</div>
                <BookOpen size={22} className="text-primary" />
              </div>
            </div>
            <div className="hero-metric">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Saved</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-foreground">{totalSaved}</div>
                <Bookmark size={22} className="text-primary" />
              </div>
            </div>
            <div className="hero-metric">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Downloads shown</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-bold text-foreground">{notes.reduce((sum, note) => sum + (note.downloadCount || 0), 0)}</div>
                <Download size={22} className="text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Recommended For You</h2>
            <p className="text-sm text-muted">
              Personalized notes based on what you view, download, bookmark, and rate.
            </p>
          </div>
          {isAuthenticated && <Badge variant="brand">{recommendedNotes.length} picks</Badge>}
        </div>

        {isAuthenticated ? (
          recommendedLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : recommendedNotes.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {recommendedNotes.map(item => {
                const note = item.note || item
                return (
                  <div key={note.id} className="relative">
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-semibold text-primary shadow-sm ring-1 ring-border">
                      Score {item.score ?? 0}
                    </div>
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
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No recommendations yet"
              description="Keep browsing, bookmarking, and downloading notes so we can learn your study preferences."
            />
          )
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Sign in for personalized notes"
            description="Once you sign in, this section will learn from your note activity and surface relevant study material."
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Saved notes</h2>
            <p className="text-sm text-muted">
              Bookmarked notes stay close for quick revisits and downloads.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBookmarked(v => !v)}
            className={`btn-secondary w-full gap-2 sm:w-auto ${showBookmarked ? 'border-primary bg-primary-soft text-primary' : ''}`}
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
              <h2 className="text-2xl font-bold text-foreground">Browse notes</h2>
              <Badge variant="brand">{noteCards} shown</Badge>
            </div>
            <p className="text-sm text-muted">
              Search by title, subject, branch, or semester. Preview PDFs before downloading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated && !isAdmin && (
              <button type="button" onClick={() => setShowUpload(true)} className="btn gap-2">
                <Upload size={14} />
                Upload Notes
              </button>
            )}
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
                <div className="absolute right-0 top-full z-20 mt-2 min-w-56 rounded-2xl border border-border bg-surface p-2 shadow-lg">
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
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-surface-elevated ${
                          option.value === sortBy ? 'text-primary' : 'text-foreground'
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

            <button type="button" onClick={() => setShowFilters(v => !v)} className="btn-secondary w-full justify-center gap-2 sm:w-auto">
              <Filter size={14} />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </button>

            <button type="button" onClick={clearFilters} className="btn-secondary w-full justify-center gap-2 sm:w-auto">
              <X size={14} />
              Reset
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="rounded-[28px] border border-border bg-surface/80 p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                <p className="text-xs text-muted">Use chips for quick narrowing across branches, subjects, and semesters.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Branch</p>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Subject</p>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Semester</p>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted">Subject search</span>
                  <input
                    value={filters.subject}
                    onChange={e => updateFilter('subject', e.target.value)}
                    placeholder="Type a subject"
                    className="h-11 w-full rounded-2xl border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted">Semester search</span>
                  <select
                    value={filters.semester}
                    onChange={e => updateFilter('semester', e.target.value)}
                    className="h-11 w-full rounded-2xl border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary"
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

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  Quick searches
                </span>
                {recentSearches.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => updateFilter('q', term)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/35 hover:text-primary"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
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

        <div className="flex flex-col gap-2 rounded-2xl bg-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Star size={14} className="text-warning" />
            Showing {noteCards} of {totalElements} notes
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
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
            title={
              showBookmarked
                ? 'No saved notes yet'
                : activeCount > 0
                  ? 'No notes match your filters'
                  : totalElements === 0
                    ? 'No approved notes yet'
                    : 'No notes yet'
            }
            description={
              showBookmarked
                ? 'Save notes you like to keep them in your personal quick-access list.'
                : activeCount > 0
                  ? 'Try widening your subject, semester, or branch filters.'
                  : totalElements === 0
                    ? 'Approved notes will appear here once they are available.'
                    : 'Be the first to share study material for your classmates.'
            }
            action={
              showBookmarked ? (
                <button type="button" onClick={() => setShowBookmarked(false)} className="btn-secondary w-full justify-center gap-2 sm:w-auto">
                  <BookOpen size={14} />
                  Browse all notes
                </button>
              ) : activeCount > 0 ? (
                <button type="button" onClick={clearFilters} className="btn-secondary w-full justify-center gap-2 sm:w-auto">
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
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-muted hover:border-primary/35 hover:text-primary'
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
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-primary/35'
                }`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  {file ? (
                    <span className="block truncate font-medium text-primary">{file.name}</span>
                  ) : (
                    <span className="text-muted">Click to select a PDF file</span>
                  )}
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      setFile(null)
                    }}
                    className="text-muted transition-colors hover:text-danger"
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

          <div className="rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-xs text-warning">
            Your note will be reviewed by admins before it appears publicly.
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowUpload(false)
                setUploadMsg({ type: '', text: '' })
              }}
              className="btn-secondary w-full justify-center sm:w-auto"
            >
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="btn w-full justify-center gap-1.5 sm:w-auto">
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
        canUseAuthenticatedPreview={canUseAuthenticatedPreview}
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
