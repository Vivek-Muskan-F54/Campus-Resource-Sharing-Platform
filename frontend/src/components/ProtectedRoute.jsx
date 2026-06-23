import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, admin = false }) {
  const { user, isAdmin, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted shadow-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
          Validating session...
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (admin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
