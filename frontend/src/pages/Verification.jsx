import { useEffect, useState } from 'react'
import {
  ShieldCheck, Upload, CheckCircle2, Clock, XCircle,
  FileImage, AlertCircle, Info
} from 'lucide-react'
import { uploadApi, verificationApi } from '../api/services'

const statusConfig = {
  PENDING: {
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    label: 'Under Review',
    desc: 'Your ID card has been submitted and is being reviewed by admins.',
  },
  APPROVED: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    label: 'Verified',
    desc: 'Your student identity has been verified. You can now access all features.',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    label: 'Rejected',
    desc: 'Your verification was rejected. Please re-submit with a clearer image.',
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
    verificationApi.mine()
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
      setMsg({ type: 'success', text: 'Verification submitted successfully!' })
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
    <div className="max-w-2xl mx-auto space-y-7 animate-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <ShieldCheck className="text-brand-600 dark:text-brand-400" />
          Student Verification
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Verify your student identity to access all features and build trust in the community.
        </p>
      </div>

      {/* Current status */}
      {loadingStatus ? (
        <div className="card animate-pulse">
          <div className="skeleton h-5 w-1/3 rounded-lg mb-3" />
          <div className="skeleton h-4 w-2/3 rounded-lg" />
        </div>
      ) : config ? (
        <div className={`rounded-2xl border p-5 ${config.bg}`}>
          <div className="flex items-center gap-3">
            <config.icon size={24} className={config.color} />
            <div>
              <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{config.desc}</p>
            </div>
          </div>
          {verification.adminRemarks && (
            <div className="mt-3 rounded-xl bg-white/50 dark:bg-black/20 px-4 py-3 text-sm">
              <span className="font-medium">Admin note: </span>{verification.adminRemarks}
            </div>
          )}
        </div>
      ) : (
        <div className="alert-info flex items-start gap-2">
          <Info size={15} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">You haven't submitted a verification request yet. Upload your college ID below to get verified.</p>
        </div>
      )}

      {/* Upload form */}
      {(!verification || verification.status === 'REJECTED') && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            {verification?.status === 'REJECTED' ? 'Resubmit Verification' : 'Submit ID Card'}
          </h2>

          {msg.text && (
            <div className={msg.type === 'success' ? 'alert-success flex items-start gap-2' : 'alert-error flex items-start gap-2'}>
              {msg.type === 'success'
                ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
                : <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
              <span className="text-sm">{msg.text}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* File drop zone */}
            <label className="relative block">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFile}
                required
                className="sr-only"
                id="id-card-file"
              />
              <div className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-8 text-center ${
                file
                  ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                  : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}>
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-32 w-auto mx-auto rounded-xl object-contain mb-3"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
                      <FileImage size={28} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-300">Click to upload ID card</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">JPG, PNG, or PDF up to 20MB</p>
                    </div>
                  </div>
                )}

                {file && (
                  <p className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400">{file.name}</p>
                )}
              </div>
            </label>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Tips for a successful verification:</p>
              <p>• Ensure the image is clear and all text is readable</p>
              <p>• Your name and roll number must be visible</p>
              <p>• Avoid glare or shadows on the ID card</p>
            </div>

            <button type="submit" disabled={uploading || !file} className="btn w-full gap-2">
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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

      {/* What happens next */}
      {!verification && (
        <div className="card space-y-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">What happens next?</h3>
          <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            {[
              'Upload your college ID card image',
              'Admins review your submission within 24 hours',
              'You get notified once verified',
              'Access all features with verified badge',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold flex items-center justify-center">
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
