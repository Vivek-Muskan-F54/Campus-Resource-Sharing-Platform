import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Hash, ShoppingBag, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const fields = [
  { name: 'name', type: 'text', label: 'Full name', placeholder: 'John Doe', icon: User, autoComplete: 'name' },
  { name: 'email', type: 'email', label: 'College email', placeholder: 'you@college.edu', icon: Mail, autoComplete: 'email' },
  { name: 'collegeRollNumber', type: 'text', label: 'College roll number', placeholder: 'CS21B001', icon: Hash, autoComplete: 'off' },
  { name: 'password', type: 'password', label: 'Password', placeholder: 'Minimum 8 characters', icon: Lock, autoComplete: 'new-password' },
]

const BENEFITS = [
  'Buy, sell, and rent academic resources',
  'Access shared study notes and PDFs',
  'Real-time chat with classmates',
  'Verified student community',
]

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', collegeRollNumber: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/login?registered=1', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-7rem)] items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="hero-panel hidden p-8 lg:block">
        <div className="space-y-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm ring-1 ring-border">
            <ShoppingBag size={22} />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Join CampusShare
            </p>
            <h1 className="hero-title max-w-xl">
              Share resources with a more polished campus network.
            </h1>
            <p className="hero-copy max-w-lg">
              Create your account to list items, discover notes, and connect with classmates in a
              premium, trusted environment.
            </p>
          </div>

          <ul className="space-y-3">
            {BENEFITS.map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                <CheckCircle2 size={18} className="flex-shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>

          <div className="hero-metric">
            <p className="text-sm font-semibold text-foreground">Built for students</p>
            <p className="mt-1 text-xs leading-6 text-muted">
              No subscriptions. No friction. Just a cleaner way to share and discover campus
              resources.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-lg">
        <div className="surface p-6 sm:p-8">
          <div className="mb-6 space-y-2">
            <div className="hero-kicker">
              <User size={12} />
              Create account
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Build your student profile
            </h2>
            <p className="text-sm leading-6 text-muted">
              Sign up once, then use the same account across marketplace, notes, orders, and chat.
            </p>
          </div>

          {error && (
            <div className="alert-error mb-4 flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {fields.map(f => (
              <div key={f.name} className="form-group">
                <label className="label" htmlFor={f.name}>
                  {f.label}
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <f.icon size={16} />
                  </span>
                  <input
                    id={f.name}
                    name={f.name}
                    type={f.name === 'password' ? (showPwd ? 'text' : 'password') : f.type}
                    placeholder={f.placeholder}
                    required
                    autoComplete={f.autoComplete}
                    className="w-full input-with-icon"
                    value={form[f.name]}
                    onChange={set}
                  />
                  {f.name === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="submit" disabled={loading} className="btn-lg w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-surface border-t-primary animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create account
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
