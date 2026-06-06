import { useCallback, useEffect, useState } from 'react'
import {
  Search, Upload, BookOpen, Download, Calendar, Hash,
  Filter, X, FileText, GraduationCap, ChevronDown, AlertCircle, CheckCircle2
} from 'lucide-react'
import { noteApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1)

function NoteCard({ note }) {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  const sizeLabel = note.fileSize
    ? note.fileSize > 1_000_000
      ? `${(note.fileSize / 1_000_000).toFixed(1)} MB`
      : `${(note.fileSize / 1_000).toFixed(0)} KB`
    : null

  return (
    <article className="card-hover flex flex-col gap-3 p-5 group">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-xl bg-brand-50 dark:bg-brand-900/30 p-3 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
          <FileText size={20} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{note.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            by {note.uploaderName || 'Anonymous'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {note.branch && (
          <Badge variant="brand">{note.branch}</Badge>
        )}
        {note.subject && (
          <Badge variant="purple">{note.subject}</Badge>
        )}
        {note.semester && (
          <Badge variant="slate">Sem {note.semester}</Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 gap-2 flex-wrap">
        <span className="flex items-center gap-1">
          <Download size={12} />
          {note.downloadCount ?? 0} downloads
        </span>
        {sizeLabel && <span>{sizeLabel}</span>}
        {note.createdAt && (
          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
        )}
      </div>

      <a
        href={`${apiBase}/notes/${note.id}/download`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary w-full text-sm justify-center gap-2"
      >
        <Download size={14} />
        Download PDF
      </a>
    </article>
  )
}

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ q: '', branch: '', subject: '', semester: '' })
  const [uploadForm, setUploadForm] = useState({ title: '', branch: '', subject: '', semester: 1 })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState({ type: '', text: '' })
  const { user } = useAuth()
  const debouncedQ = useDebounce(filters.q, 400)

  const load = useCallback(async (override = {}) => {
    setLoading(true)
    try {
      const params = { ...filters, ...override }
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const res = await noteApi.all(params)
      setNotes(res.data?.content || [])
    } catch {
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [debouncedQ]) // eslint-disable-line

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
      setUploadMsg({ type: 'success', text: 'Note submitted for moderation. It will appear once approved.' })
      setUploadForm({ title: '', branch: '', subject: '', semester: 1 })
      setFile(null)
      e.target.reset()
    } catch (err) {
      setUploadMsg({ type: 'error', text: err?.response?.data?.message || 'Upload failed. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  const clearFilters = () => {
    setFilters({ q: '', branch: '', subject: '', semester: '' })
    load({ q: '', branch: '', subject: '', semester: '' })
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GraduationCap className="text-brand-600 dark:text-brand-400" size={30} />
            Study Notes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Community-shared PDFs organised by branch, subject, and semester.
          </p>
        </div>
        {user && (
          <button onClick={() => setShowUpload(true)} className="btn gap-2 flex-shrink-0">
            <Upload size={16} />
            Upload Notes
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes by title, subject..."
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            className="w-full pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`btn-secondary gap-1.5 ${showFilters ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-700' : ''}`}
        >
          <Filter size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <form
          onSubmit={e => { e.preventDefault(); load() }}
          className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up"
        >
          <input
            placeholder="Branch (e.g. CSE, ECE)"
            value={filters.branch}
            onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))}
          />
          <input
            placeholder="Subject (e.g. DBMS)"
            value={filters.subject}
            onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))}
          />
          <select
            value={filters.semester}
            onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))}
          >
            <option value="">Any Semester</option>
            {SEMESTERS.map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={clearFilters} className="btn-secondary flex-1">
              Reset
            </button>
            <button type="submit" className="btn flex-1">
              Apply
            </button>
          </div>
        </form>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No notes found"
          description="Be the first to share study material for your classmates!"
          action={
            user ? (
              <button onClick={() => setShowUpload(true)} className="btn gap-2">
                <Upload size={15} />
                Upload first note
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map(n => <NoteCard key={n.id} note={n} />)}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => { setShowUpload(false); setUploadMsg({ type: '', text: '' }) }} title="Upload Study Notes">
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadMsg.text && (
            <div className={uploadMsg.type === 'success' ? 'alert-success flex items-start gap-2' : 'alert-error flex items-start gap-2'}>
              {uploadMsg.type === 'success'
                ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
                : <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
              <span className="text-sm">{uploadMsg.text}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-group sm:col-span-2">
              <label className="label">Title *</label>
              <input
                placeholder="e.g. Data Structures Unit 3 Notes"
                required
                value={uploadForm.title}
                onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="form-group">
              <label className="label">Branch *</label>
              <input
                placeholder="e.g. CSE"
                required
                value={uploadForm.branch}
                onChange={e => setUploadForm(f => ({ ...f, branch: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="form-group">
              <label className="label">Subject *</label>
              <input
                placeholder="e.g. Data Structures"
                required
                value={uploadForm.subject}
                onChange={e => setUploadForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="form-group">
              <label className="label">Semester *</label>
              <select
                required
                value={uploadForm.semester}
                onChange={e => setUploadForm(f => ({ ...f, semester: Number(e.target.value) }))}
                className="w-full"
              >
                {SEMESTERS.map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">PDF File *</label>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={e => setFile(e.target.files[0])}
                className="w-full text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            📋 Your note will be reviewed by admins before appearing publicly.
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowUpload(false); setUploadMsg({ type: '', text: '' }) }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="btn">
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Upload size={14} />
                  Submit for review
                </span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
