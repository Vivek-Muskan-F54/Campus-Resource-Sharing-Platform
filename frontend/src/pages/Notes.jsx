import { useCallback, useEffect, useState } from 'react'
import {
  Search, Upload, BookOpen, Download, X, FileText,
  GraduationCap, AlertCircle, CheckCircle2, Filter,
  Bookmark, BookmarkCheck, TrendingDown, Clock, Hash,
  ChevronDown, Star
} from 'lucide-react'
import { noteApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

// ─── Constants ─────────────────────────────────────────────────────────────────
const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1)

const POPULAR_BRANCHES = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'AIDS', 'MECH']

const POPULAR_SUBJECTS = [
  'Data Structures', 'DBMS', 'OS', 'CN', 'OOPS',
  'Algorithms', 'Maths', 'Physics', 'Chemistry'
]

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first',   icon: Clock },
  { value: 'downloadCount,desc', label: 'Most downloaded', icon: TrendingDown },
  { value: 'createdAt,asc',  label: 'Oldest first',   icon: Clock },
]

// ─── Local bookmark storage ────────────────────────────────────────────────────
const BOOKMARK_KEY = 'campusshare_bookmarked_notes'

const readBookmarks = () => {
  try { return new Set(JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]')) }
  catch { return new Set() }
}

const writeBookmarks = set =>
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...set]))

// ─── Filter chip ───────────────────────────────────────────────────────────────
function Chip({ label, active, onClick, variant = 'default' }) {
  const base = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer'
  const styles = active
    ? 'bg-brand-600 text-white border-brand-600 dark:bg-brand-500 dark:border-brand-500'
    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 bg-white dark:bg-slate-900'
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {label}
    </button>
  )
}

// ─── Note skeleton ─────────────────────────────────────────────────────────────
function NoteCardSkeleton() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="flex items-start gap-3">
        <div className="skeleton h-11 w-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded-lg" />
          <div className="skeleton h-3 w-1/2 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="skeleton h-5 w-14 rounded-full" />
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-5 w-12 rounded-full" />
      </div>
      <div className="skeleton h-9 w-full rounded-xl" />
    </div>
  )
}

// ─── Note card ─────────────────────────────────────────────────────────────────
function NoteCard({ note, bookmarked, onToggleBookmark }) {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  const [downloading, setDownloading] = useState(false)

  const sizeLabel = note.fileSize
    ? note.fileSize > 1_000_000
      ? `${(note.fileSize / 1_000_000).toFixed(1)} MB`
      : `${Math.round(note.fileSize / 1_000)} KB`
    : null

  const handleDownload = async e => {
    e.preventDefault()
    setDownloading(true)
    try {
      // Record the download hit, then follow the redirect
      await noteApi.recordDownload(note.id).catch(() => {})
      window.open(`${apiBase}/notes/${note.id}/download`, '_blank', 'noopener,noreferrer')
    } finally {
      setTimeout(() => setDownloading(false), 800)
    }
  }

  const dateLabel = note.createdAt
    ? new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <article className="card flex flex-col gap-3 group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* PDF icon */}
        <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
          <FileText size={20} className="text-red-500 dark:text-red-400" />
        </div>

        {/* Title + author */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-2 mb-0.5">
            {note.title}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            by {note.uploaderName || 'Anonymous'}
          </p>
        </div>

        {/* Bookmark button */}
        <button
          type="button"
          onClick={() => onToggleBookmark(note.id)}
          className={`flex-shrink-0 rounded-lg p-1.5 transition-all ${
            bookmarked
              ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30'
              : 'text-slate-300 dark:text-slate-600 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20'
          }`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this note'}
          title={bookmarked ? 'Remove bookmark' : 'Save for later'}
        >
          {bookmarked
            ? <BookmarkCheck size={16} />
            : <Bookmark size={16} />}
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {note.branch  && <Badge variant="brand">{note.branch}</Badge>}
        {note.subject && <Badge variant="purple">{note.subject}</Badge>}
        {note.semester && (
          <Badge variant="slate">
            <Hash size={9} className="mr-0.5" />
            Sem {note.semester}
          </Badge>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 gap-2">
        <span className="flex items-center gap-1.5">
          <Download size={11} />
          {note.downloadCount ?? 0} downloads
        </span>
        <div className="flex items-center gap-2">
          {sizeLabel && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium">
              {sizeLabel}
            </span>
          )}
          {dateLabel && <span>{dateLabel}</span>}
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
          downloading
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            : 'bg-brand-600 dark:bg-brand-500 text-white hover:bg-brand-700 dark:hover:bg-brand-600 active:scale-98 shadow-sm hover:shadow-md'
        }`}
        aria-label={`Download ${note.title}`}
      >
        {downloading ? (
          <>
            <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
            Opening…
          </>
        ) : (
          <>
            <Download size={14} />
            Download PDF
          </>
        )}
      </button>
    </article>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Notes() {
  const [notes, setNotes]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showUpload, setShowUpload]     = useState(false)
  const [showFilters, setShowFilters]   = useState(false)
  const [bookmarked, setBookmarked]     = useState(readBookmarks)
  const [showBookmarked, setShowBookmarked] = useState(false)
  const [sortBy, setSortBy]             = useState('createdAt,desc')
  const [sortOpen, setSortOpen]         = useState(false)

  const [filters, setFilters] = useState({
    q: '', branch: '', subject: '', semester: ''
  })
  const [uploadForm, setUploadForm] = useState({
    title: '', branch: '', subject: '', semester: 1
  })
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState({ type: '', text: '' })

  const { user } = useAuth()
  const debouncedQ = useDebounce(filters.q, 350)

  // ── Load notes ───────────────────────────────────────────────────────────────
  const load = useCallback(async (override = {}) => {
    setLoading(true)
    try {
      const params = { ...filters, ...override }
      const [sortField] = sortBy.split(',')
      // Backend accepts standard pageable sort param
      params.sort = sortBy
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const res = await noteApi.all(params)
      setNotes(res.data?.content || [])
    } catch {
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [filters, sortBy])

  useEffect(() => { load() }, [debouncedQ, sortBy]) // eslint-disable-line

  // ── Bookmark toggle ──────────────────────────────────────────────────────────
  const toggleBookmark = id => {
    setBookmarked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      writeBookmarks(next)
      return next
    })
  }

  // ── Upload ───────────────────────────────────────────────────────────────────
  const handleUpload = async e => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadMsg({ type: '', text: '' })
    try {
      const data = new FormData()
      Object.entries(uploadForm).forEach(([k, v]) => data.append(k, v))
      data.append('file', file)
      await noteApi.upload(data)
      setUploadMsg({
        type: 'success',
        text: 'Note submitted! It will appear publicly once an admin approves it.'
      })
      setUploadForm({ title: '', branch: '', subject: '', semester: 1 })
      setFile(null)
      e.target.reset()
    } catch (err) {
      setUploadMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Upload failed. Please try again.'
      })
    } finally {
      setUploading(false)
    }
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  const clearFilters = () => {
    setFilters({ q: '', branch: '', subject: '', semester: '' })
    load({ q: '', branch: '', subject: '', semester: '' })
  }

  const activeCount = Object.values(filters).filter(Boolean).length

  // Displayed notes (bookmark filter applied client-side)
  const displayedNotes = showBookmarked
    ? notes.filter(n => bookmarked.has(n.id))
    : notes

  const currentSort = SORT_OPTIONS.find(o => o.value === sortBy) || SORT_OPTIONS[0]

  return (
    <div className="space-y-8 animate-in">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <GraduationCap size={18} className="text-white" />
            </div>
            Study Notes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Community-shared PDFs organised by branch, subject, and semester.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bookmark toggle */}
          <button
            type="button"
            onClick={() => setShowBookmarked(v => !v)}
            className={`btn-secondary gap-1.5 text-sm ${showBookmarked ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400' : ''}`}
          >
            {showBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            <span className="hidden sm:inline">Saved</span>
            {bookmarked.size > 0 && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {bookmarked.size}
              </span>
            )}
          </button>

          {user && (
            <button onClick={() => setShowUpload(true)} className="btn gap-1.5 text-sm">
              <Upload size={15} />
              Upload Notes
            </button>
          )}
        </div>
      </div>

      {/* ── Search + controls bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by title, subject, branch…"
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            className="w-full pl-9 py-2.5"
            aria-label="Search notes"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen(v => !v)}
            className="btn-secondary text-sm gap-1.5 whitespace-nowrap"
          >
            <currentSort.icon size={13} />
            {currentSort.label}
            <ChevronDown size={12} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-20 overflow-hidden animate-slide-up">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { setSortBy(o.value); setSortOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    o.value === sortBy
                      ? 'text-brand-600 dark:text-brand-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <o.icon size={13} />
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className={`btn-secondary text-sm gap-1.5 ${showFilters ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300' : ''}`}
        >
          <Filter size={14} />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* ── Quick-filter chips ────────────────────────────────────────── */}
      {showFilters && (
        <div className="card space-y-5 animate-slide-up">
          {/* Branch chips */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2.5">Branch</p>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="All"
                active={!filters.branch}
                onClick={() => { setFilters(f => ({ ...f, branch: '' })); load({ branch: '' }) }}
              />
              {POPULAR_BRANCHES.map(b => (
                <Chip
                  key={b}
                  label={b}
                  active={filters.branch === b}
                  onClick={() => {
                    const next = filters.branch === b ? '' : b
                    setFilters(f => ({ ...f, branch: next }))
                    load({ branch: next })
                  }}
                />
              ))}
              {/* Free-text fallback */}
              {filters.branch && !POPULAR_BRANCHES.includes(filters.branch) && (
                <Chip label={filters.branch} active onClick={() => { setFilters(f => ({ ...f, branch: '' })); load({ branch: '' }) }} />
              )}
            </div>
            {/* Custom branch input */}
            <input
              type="text"
              placeholder="Or type a branch…"
              value={POPULAR_BRANCHES.includes(filters.branch) ? '' : filters.branch}
              onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))}
              className="mt-2.5 w-full sm:w-48 py-1.5 text-sm"
            />
          </div>

          {/* Subject chips */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2.5">Subject</p>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="All"
                active={!filters.subject}
                onClick={() => { setFilters(f => ({ ...f, subject: '' })); load({ subject: '' }) }}
              />
              {POPULAR_SUBJECTS.map(s => (
                <Chip
                  key={s}
                  label={s}
                  active={filters.subject === s}
                  onClick={() => {
                    const next = filters.subject === s ? '' : s
                    setFilters(f => ({ ...f, subject: next }))
                    load({ subject: next })
                  }}
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type a subject…"
              value={POPULAR_SUBJECTS.includes(filters.subject) ? '' : filters.subject}
              onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))}
              className="mt-2.5 w-full sm:w-56 py-1.5 text-sm"
            />
          </div>

          {/* Semester chips */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2.5">Semester</p>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="All"
                active={!filters.semester}
                onClick={() => { setFilters(f => ({ ...f, semester: '' })); load({ semester: '' }) }}
              />
              {SEMESTERS.map(s => (
                <Chip
                  key={s}
                  label={`Sem ${s}`}
                  active={String(filters.semester) === String(s)}
                  onClick={() => {
                    const next = String(filters.semester) === String(s) ? '' : String(s)
                    setFilters(f => ({ ...f, semester: next }))
                    load({ semester: next })
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={clearFilters} className="btn-secondary text-sm">Reset</button>
            <button type="button" onClick={() => { load(); setShowFilters(false) }} className="btn text-sm">Apply</button>
          </div>
        </div>
      )}

      {/* ── Active filter pills ──────────────────────────────────────── */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.branch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/40 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300">
              Branch: {filters.branch}
              <button onClick={() => { setFilters(f => ({ ...f, branch: '' })); load({ branch: '' }) }}>
                <X size={11} className="ml-0.5" />
              </button>
            </span>
          )}
          {filters.subject && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/40 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
              Subject: {filters.subject}
              <button onClick={() => { setFilters(f => ({ ...f, subject: '' })); load({ subject: '' }) }}>
                <X size={11} className="ml-0.5" />
              </button>
            </span>
          )}
          {filters.semester && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Sem {filters.semester}
              <button onClick={() => { setFilters(f => ({ ...f, semester: '' })); load({ semester: '' }) }}>
                <X size={11} className="ml-0.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Notes grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <NoteCardSkeleton key={i} />)}
        </div>
      ) : showBookmarked && displayedNotes.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved notes yet"
          description="Click the bookmark icon on any note to save it for quick access."
          action={
            <button onClick={() => setShowBookmarked(false)} className="btn-secondary gap-2">
              <BookOpen size={15} />
              Browse all notes
            </button>
          }
        />
      ) : displayedNotes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={activeCount > 0 ? 'No notes match your filters' : 'No notes yet'}
          description={
            activeCount > 0
              ? 'Try removing some filters or search with different terms.'
              : 'Be the first to share study material for your classmates!'
          }
          action={
            activeCount > 0 ? (
              <button onClick={clearFilters} className="btn-secondary gap-2">
                <X size={15} />
                Clear filters
              </button>
            ) : user ? (
              <button onClick={() => setShowUpload(true)} className="btn gap-2">
                <Upload size={15} />
                Upload first note
              </button>
            ) : null
          }
        />
      ) : (
        <>
          {showBookmarked && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <BookmarkCheck size={14} className="text-brand-500" />
              Showing {displayedNotes.length} saved note{displayedNotes.length !== 1 ? 's' : ''}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedNotes.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                bookmarked={bookmarked.has(n.id)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Upload modal ─────────────────────────────────────────────── */}
      <Modal
        open={showUpload}
        onClose={() => { setShowUpload(false); setUploadMsg({ type: '', text: '' }) }}
        title="Upload Study Notes"
      >
        <form onSubmit={handleUpload} className="space-y-5">
          {uploadMsg.text && (
            <div className={uploadMsg.type === 'success' ? 'alert-success flex items-start gap-2' : 'alert-error flex items-start gap-2'}>
              {uploadMsg.type === 'success'
                ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
                : <AlertCircle  size={15} className="mt-0.5 flex-shrink-0" />}
              <span className="text-sm">{uploadMsg.text}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-group sm:col-span-2">
              <label className="label" htmlFor="note-title">Title *</label>
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
              <label className="label" htmlFor="note-branch">Branch *</label>
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
                {POPULAR_BRANCHES.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="note-subject">Subject *</label>
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
                {POPULAR_SUBJECTS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="note-semester">Semester *</label>
              <div className="flex flex-wrap gap-1.5">
                {SEMESTERS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setUploadForm(f => ({ ...f, semester: s }))}
                    className={`h-8 w-8 rounded-lg text-sm font-medium border transition-all ${
                      uploadForm.semester === s
                        ? 'bg-brand-600 text-white border-brand-600 dark:bg-brand-500 dark:border-brand-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="note-file">PDF File *</label>
              <label
                htmlFor="note-file"
                className={`flex items-center gap-3 w-full rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all ${
                  file
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                    : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-600'
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-red-500 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  {file
                    ? <span className="text-brand-600 dark:text-brand-400 font-medium truncate block">{file.name}</span>
                    : <span className="text-slate-400 dark:text-slate-500">Click to select PDF file</span>}
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setFile(null) }}
                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                onChange={e => setFile(e.target.files[0])}
                className="sr-only"
              />
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            📋 Your note will be reviewed by admins before it appears publicly. Usually within 24 hours.
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowUpload(false); setUploadMsg({ type: '', text: '' }) }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="btn gap-1.5">
              {uploading ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Uploading…
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
    </div>
  )
}
