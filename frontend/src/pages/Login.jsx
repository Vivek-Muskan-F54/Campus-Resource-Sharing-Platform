import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ShoppingBag, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const notice = params.has('registered')
    ? 'Registration complete. Check your inbox to verify your email before signing in.'
    : params.has('verified')
      ? 'Your email has been verified. You can sign in now.'
      : params.has('reset')
        ? 'Your password was reset successfully. Please sign in with your new password.'
        : ''

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-7rem)] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hero-panel p-8 sm:p-10">
        <div className="space-y-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm ring-1 ring-border">
            <ShoppingBag size={22} />
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              CampusShare
            </p>
            <h1 className="hero-title max-w-xl">
              A cleaner way to share campus resources.
            </h1>
            <p className="hero-copy max-w-xl">
              Sign in to browse the marketplace, manage orders, chat with classmates, and keep
              everything in one polished workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="hero-metric">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Marketplace</p>
              <p className="mt-2 text-2xl font-bold text-foreground">Fast</p>
            </div>
            <div className="hero-metric">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Notes</p>
              <p className="mt-2 text-2xl font-bold text-foreground">Trusted</p>
            </div>
            <div className="hero-metric">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Chat</p>
              <p className="mt-2 text-2xl font-bold text-foreground">Live</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md">
        <div className="surface p-6 sm:p-8">
          <div className="mb-6 space-y-2">
            <div className="hero-kicker">
              <ShoppingBag size={12} />
              Sign in
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-sm leading-6 text-muted">
              Use your campus email to get back into your account.
            </p>
          </div>

          <div className="space-y-4">
            {notice && (
              <div className="alert-success flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
                <span>{notice}</span>
              </div>
            )}
            {error && (
              <div className="alert-error flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="form-group">
                <label className="label" htmlFor="email">
                  Email address
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Mail size={16} />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@college.edu"
                    required
                    autoComplete="email"
                    className="w-full input-with-icon"
                    value={form.email}
                    onChange={set}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Lock size={16} />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full input-with-icon pr-10"
                    value={form.password}
                    onChange={set}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-lg w-full">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-surface border-t-primary animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Continue
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>

            <div className="space-y-3 pt-2 text-center text-sm text-muted">
              <p>
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Create account
                </Link>
              </p>
              <p>
                <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
                  Forgot your password?
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          By signing in, you agree to our Terms of Service.
        </p>
      </section>
    </div>
  )
}
