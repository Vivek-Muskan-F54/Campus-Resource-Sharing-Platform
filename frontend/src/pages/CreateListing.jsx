import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  Tag,
  Layers,
  AlertCircle,
  Image as ImageIcon,
  X,
  Upload,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { categoryApi, listingApi, uploadApi } from '../api/services'

const CONDITIONS = [
  { value: 'NEW', label: 'New', desc: 'Brand new, never used' },
  { value: 'LIKE_NEW', label: 'Like New', desc: 'Barely used, excellent condition' },
  { value: 'GOOD', label: 'Good', desc: 'Minor signs of use, works perfectly' },
  { value: 'FAIR', label: 'Fair', desc: 'Some wear, fully functional' },
  { value: 'POOR', label: 'Poor', desc: 'Heavy use, still functional' },
]

const TYPES = [
  { value: 'SELL', label: 'Sell', icon: '💰', desc: 'Transfer ownership permanently' },
  { value: 'RENT', label: 'Rent', icon: '🕐', desc: 'Lend for a period of time' },
  { value: 'EXCHANGE', label: 'Exchange', icon: '🔄', desc: 'Trade for something else' },
]

export default function CreateListing() {
  const [categories, setCategories] = useState([])
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    categoryId: '',
    type: 'SELL',
    condition: 'GOOD',
  })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    categoryApi.all()
      .then(r => setCategories(r.data || []))
      .catch(() => setCategories([]))
  }, [])

  const handleFiles = e => {
    const selected = Array.from(e.target.files).slice(0, 5)
    setFiles(selected)
    const urls = selected.map(f => URL.createObjectURL(f))
    setPreviews(prev => {
      prev.forEach(url => URL.revokeObjectURL(url))
      return urls
    })
  }

  const removeFile = i => {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    URL.revokeObjectURL(previews[i])
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')

    if (!form.categoryId) {
      setError('Please select a category.')
      return
    }
    if (Number(form.price) < 0) {
      setError('Price cannot be negative.')
      return
    }

    setUploading(true)
    try {
      const imageUrls = []
      for (const f of files) {
        const res = await uploadApi.file(f, 'listings')
        imageUrls.push(res.data.url)
      }
      await listingApi.create({
        ...form,
        categoryId: Number(form.categoryId),
        price: Number(form.price),
        imageUrls,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create listing. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="surface overflow-hidden">
        <div className="hero-gradient relative overflow-hidden px-6 py-8 text-white sm:px-8">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute -left-12 top-0 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />
          </div>
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                <Sparkles size={11} />
                Marketplace
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span>Marketplace</span>
                  <ChevronRight size={14} />
                  <span>Create Listing</span>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Create a listing
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  Share your unused resources with the campus community through a cleaner, more
                  professional publishing flow.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Photos</p>
                <p className="mt-1 text-2xl font-bold">5 max</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Review</p>
                <p className="mt-1 text-2xl font-bold">Admin</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Format</p>
                <p className="mt-1 text-2xl font-bold">Simple</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="alert-error flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="section-shell">
          <h2 className="section-title flex items-center gap-2">
            <Package size={16} className="text-brand-600 dark:text-brand-400" />
            Basic information
          </h2>

          <div className="form-group">
            <label className="label" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Engineering Mathematics Textbook"
              value={form.title}
              onChange={set}
              className="w-full"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-group">
              <label className="label" htmlFor="price">
                Price (₹){' '}
                {form.type === 'EXCHANGE' && (
                  <span className="text-xs font-medium text-slate-400">(or 0 for exchange)</span>
                )}
              </label>
              <div className="input-wrapper">
                <span className="input-icon text-slate-400">₹</span>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0"
                  value={form.price}
                  onChange={set}
                  className="w-full input-with-icon"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="categoryId">
                Category *
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                value={form.categoryId}
                onChange={set}
                className="w-full"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              placeholder="Describe the item's condition, what is included, and anything a buyer should know."
              value={form.description}
              onChange={set}
              className="w-full resize-none"
            />
          </div>
        </div>

        <div className="section-shell">
          <h2 className="section-title flex items-center gap-2">
            <Tag size={16} className="text-brand-600 dark:text-brand-400" />
            Listing type
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
                className={`rounded-3xl border p-4 text-left transition-all ${
                  form.type === t.value
                    ? 'border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-900/20'
                    : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700'
                }`}
              >
                <div className="text-2xl">{t.icon}</div>
                <div className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
                  {t.label}
                </div>
                <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="section-shell">
          <h2 className="section-title flex items-center gap-2">
            <Layers size={16} className="text-brand-600 dark:text-brand-400" />
            Item condition
          </h2>
          <div className="grid gap-2 sm:grid-cols-5">
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                className={`rounded-3xl border p-3 text-center transition-all ${
                  form.condition === c.value
                    ? 'border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-900/20'
                    : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.label}</div>
                <div className="mt-1 text-[10px] leading-4 text-slate-400 dark:text-slate-500">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="section-shell">
          <h2 className="section-title flex items-center gap-2">
            <ImageIcon size={16} className="text-brand-600 dark:text-brand-400" />
            Photos <span className="text-sm font-normal text-slate-400">(up to 5)</span>
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {previews.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                <img src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
                {i === 0 && (
                  <span className="absolute left-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
              </div>
            ))}

            {previews.length < 5 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 bg-white text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-600 dark:hover:bg-brand-900/10">
                <Upload size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  Add photo
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFiles}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {files.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {files.length} photo{files.length > 1 ? 's' : ''} selected. First photo will be the
              cover image.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={uploading} className="btn px-8">
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Publishing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Publish Listing
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
