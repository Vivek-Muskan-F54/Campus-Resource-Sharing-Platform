import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, DollarSign, Tag, Layers, AlertCircle,
  Image as ImageIcon, X, Upload, ChevronRight, CheckCircle2
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
    <div className="max-w-3xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
          <span>Marketplace</span>
          <ChevronRight size={14} />
          <span className="text-slate-900 dark:text-slate-100">Create Listing</span>
        </div>
        <h1 className="page-title">Create a Listing</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Share your unused resources with the campus community.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="alert-error flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Basic info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package size={16} className="text-brand-600 dark:text-brand-400" />
            Basic Information
          </h2>

          <div className="form-group">
            <label className="label" htmlFor="title">Title *</label>
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
                Price (₹) {form.type === 'EXCHANGE' && <span className="text-slate-400 text-xs">(or 0 for exchange)</span>}
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
              <label className="label" htmlFor="categoryId">Category *</label>
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
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              placeholder="Describe the item's features, why you're listing it, any details buyers should know..."
              value={form.description}
              onChange={set}
              className="w-full resize-none"
            />
          </div>
        </div>

        {/* Listing type */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag size={16} className="text-brand-600 dark:text-brand-400" />
            Listing Type
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  form.type === t.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700'
                }`}
              >
                <div className="text-xl mb-1">{t.icon}</div>
                <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{t.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers size={16} className="text-brand-600 dark:text-brand-400" />
            Item Condition
          </h2>
          <div className="grid gap-2 sm:grid-cols-5">
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                className={`rounded-xl border-2 p-2.5 text-center transition-all ${
                  form.condition === c.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700'
                }`}
              >
                <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{c.label}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ImageIcon size={16} className="text-brand-600 dark:text-brand-400" />
            Photos <span className="text-sm font-normal text-slate-400">(up to 5)</span>
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative group aspect-square">
                <img
                  src={src}
                  alt={`Preview ${i + 1}`}
                  className="h-full w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={11} />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                    Cover
                  </span>
                )}
              </div>
            ))}

            {previews.length < 5 && (
              <label className="aspect-square cursor-pointer rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-600 flex flex-col items-center justify-center gap-1 transition-colors">
                <Upload size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-xs text-slate-400 dark:text-slate-500">Add photo</span>
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
              {files.length} photo{files.length > 1 ? 's' : ''} selected · First photo will be the cover image
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
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
