import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../api/services'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const ran = useRef(false)
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(token ? '' : 'This reset link is missing a token.')
  const [success, setSuccess] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) return
  }, [token])

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await authApi.resetPassword({ token, ...form })
      setSuccess(data?.message || 'Password reset successful.')
      setTimeout(() => navigate('/login?reset=1', { replace: true }), 1200)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reset your password right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8 animate-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 mb-4 shadow-glow">
            <Lock size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset password</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Choose a new password for your account
          </p>
        </div>

        <div className="card space-y-5">
          {error && (
            <div className="alert-error flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert-success flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="form-group">
              <label className="label" htmlFor="password">New password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full input-with-icon pr-10"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="confirmPassword">Confirm password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={16} />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="w-full input-with-icon"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
            </div>

            <button type="submit" disabled={loading || !token} className="btn w-full py-3 text-sm font-semibold">
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/login" className="inline-flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400 hover:underline">
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
