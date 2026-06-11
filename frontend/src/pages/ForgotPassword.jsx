import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import { authApi } from '../api/services'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await authApi.forgotPassword({ email })
      setSuccess(data?.message || 'If the email exists, reset instructions have been sent.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to process your request right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8 animate-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 mb-4 shadow-glow">
            <KeyRound size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forgot password</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Enter your email and we will send a recovery link
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
              <label className="label" htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@college.edu"
                  className="w-full input-with-icon"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn w-full py-3 text-sm font-semibold">
              {loading ? 'Sending...' : 'Send reset link'}
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
