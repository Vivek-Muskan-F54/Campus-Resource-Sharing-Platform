import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../api/services'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const ran = useRef(false)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState(token ? '' : 'This verification link is missing a token.')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (ran.current || !token) return
    ran.current = true

    const run = async () => {
      try {
        const { data } = await authApi.verifyEmail({ token })
        setSuccess(data?.message || 'Email verified successfully.')
        setTimeout(() => navigate('/login?verified=1', { replace: true }), 1200)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to verify your email right now.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [token, navigate])

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8 animate-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 mb-4 shadow-glow">
            <MailCheck size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify email</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Confirming your email keeps your account secure
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

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 text-sm text-slate-600 dark:text-slate-300">
            {loading && !error && !success ? 'Verifying your account...' : 'You can close this page once verification is complete.'}
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
              Go to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
