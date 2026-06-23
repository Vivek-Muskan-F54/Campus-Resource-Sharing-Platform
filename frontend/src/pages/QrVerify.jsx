import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, Camera, CameraOff, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { qrApi } from '../api/services'

export default function QrVerify() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(0)
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const startCamera = async () => {
    setError('')
    setStatus('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
    } catch {
      setError('Unable to open the camera. Please check permissions.')
    }
  }

  useEffect(() => {
    if (!scanning || !videoRef.current) return
    if (!('BarcodeDetector' in window)) {
      setError('QR scanning is not supported in this browser. Use the token field below instead.')
      stopCamera()
      return
    }

    detectorRef.current ??= new window.BarcodeDetector({ formats: ['qr_code'] })

    const scan = async () => {
      try {
        if (videoRef.current?.readyState >= 2) {
          const codes = await detectorRef.current.detect(videoRef.current)
          if (codes?.[0]?.rawValue) {
            setToken(codes[0].rawValue)
            stopCamera()
            return
          }
        }
      } catch {
        // keep scanning
      }
      rafRef.current = requestAnimationFrame(scan)
    }

    rafRef.current = requestAnimationFrame(scan)
    return () => stopCamera()
  }, [scanning])

  const verify = async e => {
    e.preventDefault()
    setError('')
    setStatus('')
    try {
      const res = await qrApi.verify(token.trim())
      setStatus(`Order #${res.data.id} completed successfully!`)
      setToken('')
      setTimeout(() => navigate('/orders', { replace: true }), 1500)
    } catch (err) {
      setError(err?.response?.data?.message || 'QR verification failed. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/orders')}
          className="btn-ghost mb-4 gap-2 pl-1 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </button>
        <h1 className="page-title flex items-center gap-2">
          <QrCode className="text-brand-600 dark:text-brand-400" />
          QR Verification
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Scan the seller's handover QR code or paste the token to complete the order.
        </p>
      </div>

      {/* Camera section */}
      <div className="card space-y-4">
        <h2 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Camera size={16} className="text-brand-600 dark:text-brand-400" />
          Camera Scanner
        </h2>

        <div className="overflow-hidden rounded-2xl bg-slate-900 aspect-video relative">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="rounded-2xl bg-white/10 p-5">
                <QrCode size={36} className="text-white/60" />
              </div>
              <p className="text-white/50 text-sm">Camera preview</p>
            </div>
          )}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-48 w-48 border-2 border-brand-400 rounded-2xl" style={{
                boxShadow: '0 0 0 9999px rgb(var(--color-overlay) / 0.5)'
              }}>
                <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-brand-400 rounded-tl" />
                <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-brand-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-brand-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-brand-400 rounded-br" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {scanning ? (
            <button onClick={stopCamera} className="btn-secondary gap-2">
              <CameraOff size={15} />
              Stop Camera
            </button>
          ) : (
            <button onClick={startCamera} className="btn gap-2">
              <Camera size={15} />
              Start Camera Scan
            </button>
          )}
        </div>
      </div>

      {/* Manual token entry */}
      <form onSubmit={verify} className="card space-y-4">
        <h2 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <QrCode size={16} className="text-brand-600 dark:text-brand-400" />
          Manual Token Entry
        </h2>

        <div className="form-group">
          <label className="label" htmlFor="qr-token">Scanned / Pasted Token</label>
          <textarea
            id="qr-token"
            rows={3}
            className="w-full font-mono text-sm resize-none"
            placeholder="Paste the QR token here if your browser doesn't support automatic scanning..."
            value={token}
            onChange={e => setToken(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={!token.trim()} className="btn gap-2">
            <Check size={15} />
            Verify & Complete Order
          </button>
          {token && (
            <button type="button" onClick={() => setToken('')} className="btn-secondary">
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Status / Error messages */}
      {status && (
        <div className="alert-success flex items-center gap-2 animate-in">
          <Check size={16} className="flex-shrink-0" />
          {status}
        </div>
      )}
      {error && (
        <div className="alert-error flex items-center gap-2 animate-in">
          <AlertCircle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
