import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  FileImage,
  AlertCircle,
  Info,
  Sparkles,
} from 'lucide-react'
import { uploadApi, verificationApi } from '../api/services'

const statusConfig = {
  PENDING: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning-soft border-warning/20',
    label: 'Under review',
    desc: 'Your ID card has been submitted and is being reviewed by admins.',
  },
  APPROVED: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success-soft border-success/20',
    label: 'Verified',
    desc: 'Your student identity has been verified. You can now access all features.',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-danger',
    bg: 'bg-danger-soft border-danger/20',
    label: 'Rejected',
    desc: 'Your verification was rejected. Please resubmit with a clearer image.',
  },
}

export default function Verification() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [verification, setVerification] = useState(null)
  const [preview, setPreview] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    verificationApi
      .mine()
      .then(r => setVerification(r.data))
      .catch(() => setVerification(null))
      .finally(() => setLoadingStatus(false))
  }, [])

  const handleFile = e => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const submit = async e => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setMsg({ type: '', text: '' })
    try {
      const up = await uploadApi.file(file, 'verification')
      const res = await verificationApi.submit(up.data.url)
      setVerification(res.data)
      setMsg({ type: 'success', text: 'Verification submitted successfully.' })
      setFile(null)
      setPreview(null)
    } catch (err) {
      setMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Submission failed. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  const config = verification ? statusConfig[verification.status] : null

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in">
      <div className="surface overflow-hidden">
        <div className="px-6 py-8 sm:px-8">
          <div className="space-y-3">
            <div className="hero-kicker">
              <Sparkles size={11} />
              Verification
            </div>
            <h1 className="hero-title">
              Student verification
            </h1>
            <p className="hero-copy max-w-2xl">
              Verify your student identity to unlock all features and build trust in the community.
            </p>
          </div>
        </div>
      </div>

      {loadingStatus ? (
        <div className="card animate-pulse">
          <div className="skeleton mb-3 h-5 w-1/3 rounded-full" />
          <div className="skeleton h-4 w-2/3 rounded-full" />
        </div>
      ) : config ? (
        <div className={`rounded-[28px] border p-5 ${config.bg}`}>
          <div className="flex items-center gap-3">
            <config.icon size={24} className={config.color} />
            <div>
              <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
              <p className="mt-0.5 text-sm text-muted">{config.desc}</p>
            </div>
          </div>
          {verification.adminRemarks && (
            <div className="mt-3 rounded-2xl bg-white/60 px-4 py-3 text-sm dark:bg-black/20">
              <span className="font-semibold">Admin note: </span>
              {verification.adminRemarks}
            </div>
          )}
        </div>
      ) : (
        <div className="alert-info flex items-start gap-2">
          <Info size={15} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            You haven&apos;t submitted a verification request yet. Upload your college ID below to get
            verified.
          </p>
        </div>
      )}

      {(!verification || verification.status === 'REJECTED') && (
        <div className="section-shell">
          <h2 className="section-title">
            {verification?.status === 'REJECTED' ? 'Resubmit verification' : 'Submit ID card'}
          </h2>

          {msg.text && (
            <div
              className={
                msg.type === 'success'
                  ? 'alert-success flex items-start gap-2'
                  : 'alert-error flex items-start gap-2'
              }
            >
              {msg.type === 'success' ? (
                <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              )}
              <span className="text-sm">{msg.text}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <label className="relative block">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFile}
                required
                className="sr-only"
                id="id-card-file"
              />
              <div
                className={`cursor-pointer rounded-[28px] border-2 border-dashed p-8 text-center transition-all ${
                  file
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-primary/35 hover:bg-surface-elevated'
                }`}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="mx-auto mb-3 h-36 w-auto rounded-2xl object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-2xl bg-surface-elevated p-4">
                      <FileImage size={28} className="text-muted" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Click to upload ID card
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        JPG, PNG, or PDF up to 20MB
                      </p>
                    </div>
                  </div>
                )}

                {file && (
                  <p className="mt-3 text-sm font-semibold text-primary">
                    {file.name}
                  </p>
                )}
              </div>
            </label>

            <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-xs text-muted">
              <p className="mb-1 font-semibold text-foreground">
                Tips for a successful verification:
              </p>
              <p>Ensure the image is clear and all text is readable.</p>
              <p>Your name and roll number must be visible.</p>
              <p>Avoid glare or shadows on the ID card.</p>
            </div>

            <button type="submit" disabled={uploading || !file} className="btn w-full gap-2">
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-surface border-t-primary animate-spin" />
                  Uploading...
                </span>
              ) : (
                <>
                  <Upload size={16} />
                  Submit for verification
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {!verification && (
        <div className="section-shell">
          <h3 className="section-title">What happens next?</h3>
          <ol className="space-y-3 text-sm text-muted">
            {[
              'Upload your college ID card image',
              'Admins review your submission within 24 hours',
              'You get notified once verified',
              'Access all features with a verified badge',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
