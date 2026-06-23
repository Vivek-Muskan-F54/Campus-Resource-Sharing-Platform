import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

// Lazy-loaded pages for code splitting
const Marketplace = lazy(() => import('./pages/Marketplace'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Notes = lazy(() => import('./pages/Notes'))
const Orders = lazy(() => import('./pages/Orders'))
const CreateListing = lazy(() => import('./pages/CreateListing'))
const Chat = lazy(() => import('./pages/Chat'))
const Verification = lazy(() => import('./pages/Verification'))
const QrVerify = lazy(() => import('./pages/QrVerify'))
const Admin = lazy(() => import('./pages/Admin'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-[3px] border-primary-soft border-t-primary animate-spin" />
        <p className="text-sm text-muted">Loading...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Marketplace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/notes" element={<Notes />} />

          <Route path="/create" element={
            <ProtectedRoute><CreateListing /></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><Orders /></ProtectedRoute>
          } />
          <Route path="/qr-verify" element={
            <ProtectedRoute><QrVerify /></ProtectedRoute>
          } />
          <Route path="/verification" element={
            <ProtectedRoute><Verification /></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><Chat /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute admin><Admin /></ProtectedRoute>
          } />

          {/* Catch-all 404 */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="text-7xl mb-4">🔍</div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Page not found</h1>
              <p className="text-muted mb-6">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <a href="/" className="btn">Go home</a>
            </div>
          } />
        </Route>
      </Routes>
    </Suspense>
  )
}
