import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Hash, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const fields = [
  { name: 'name', type: 'text', label: 'Full name', placeholder: 'John Doe', icon: User, autoComplete: 'name' },
  { name: 'email', type: 'email', label: 'College email', placeholder: 'you@college.edu', icon: Mail, autoComplete: 'email' },
  { name: 'collegeRollNumber', type: 'text', label: 'College roll number', placeholder: 'CS21B001', icon: Hash, autoComplete: 'off' },
  { name: 'password', type: 'password', label: 'Password', placeholder: 'Min. 8 characters', icon: Lock, autoComplete: 'new-password' },
]

const BENEFITS = [
  'Buy, sell, and rent academic resources',
  'Access shared study notes & PDFs',
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
    <div className="flex min-h-[80vh] items-center justify-center py-8 animate-in">
      <div className="w-full max-w-4xl grid gap-8 lg:grid-cols-2">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-center space-y-8">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 mb-5 shadow-glow">
              <ShoppingBag size={22} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
              Join the campus<br />
              <span className="text-gradient">sharing community</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Connect with thousands of students to share resources, notes, and more.
            </p>
          </div>

          <ul className="space-y-3">
            {BENEFITS.map(b => (
              <li key={b} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 p-4">
            <p className="text-sm text-brand-700 dark:text-brand-300 font-medium">
              🎓 Free for all college students
            </p>
            <p className="text-xs text-brand-600/70 dark:text-brand-400/70 mt-1">
              No fees, no subscriptions — just a thriving campus economy.
            </p>
          </div>
        </div>

        {/* Right panel - form */}
        <div>
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 mb-3 shadow-glow">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Free for all college students</p>
          </div>

          <div className="card space-y-5">
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create account</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fill in your details to get started</p>
            </div>

            {error && (
              <div className="alert-error flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {fields.map(f => (
                <div key={f.name} className="form-group">
                  <label className="label" htmlFor={f.name}>{f.label}</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><f.icon size={16} /></span>
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
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button type="submit" disabled={loading} className="btn w-full py-3 text-sm font-semibold">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
