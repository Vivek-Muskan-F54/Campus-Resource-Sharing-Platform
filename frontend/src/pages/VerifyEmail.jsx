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
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm ring-1 ring-primary/10">
            <MailCheck size={22} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify email</h1>
          <p className="mt-1.5 text-sm text-muted">
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

          <div className="rounded-2xl border border-border bg-surface-elevated p-4 text-sm text-muted">
            {loading && !error && !success ? 'Verifying your account...' : 'You can close this page once verification is complete.'}
          </div>

          <p className="text-center text-sm text-muted">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Go to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
