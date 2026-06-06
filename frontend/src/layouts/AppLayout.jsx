import { useMemo, useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Menu, X, Sun, Moon, ShoppingBag, BookOpen, Package,
  ShieldCheck, MessageCircle, LayoutDashboard, Plus, Home,
  LogOut, User, ChevronDown
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NotificationDropdown from '../components/NotificationDropdown'
import Avatar from '../components/ui/Avatar'

const navItems = [
  { label: 'Marketplace', path: '/', icon: Home, exact: true },
  { label: 'Notes', path: '/notes', icon: BookOpen },
  { label: 'Orders', path: '/orders', icon: Package, auth: true },
  { label: 'Verification', path: '/verification', icon: ShieldCheck, auth: true },
  { label: 'Chat', path: '/chat', icon: MessageCircle, auth: true },
]

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  const visibleNav = useMemo(() => {
    const base = navItems.filter(item => !item.auth || !!user)
    return isAdmin ? [...base, { label: 'Admin', path: '/admin', icon: LayoutDashboard }] : base
  }, [user, isAdmin])

  const navClass = ({ isActive }) =>
    isActive
      ? 'nav-link-active'
      : 'nav-link'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* ─── Desktop Navbar ─────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="page-container">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 group-hover:bg-brand-700 transition-colors">
                <ShoppingBag size={16} className="text-white" />
              </div>
              <span className="hidden sm:block text-lg">
                Campus<span className="text-brand-600 dark:text-brand-400">Share</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-1 xl:flex">
              {visibleNav.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={navClass}
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Create listing button */}
              {user && (
                <Link
                  to="/create"
                  className="hidden sm:flex btn gap-1.5 text-sm"
                >
                  <Plus size={16} />
                  <span className="hidden md:inline">Create Listing</span>
                  <span className="inline md:hidden">New</span>
                </Link>
              )}

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Notifications */}
              {user && <NotificationDropdown />}

              {/* Auth */}
              {user ? (
                <div className="relative hidden xl:block">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(v => !v)}
                    className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    <Avatar name={user.name || user.email} size="sm" />
                    <span className="hidden lg:block max-w-[100px] truncate">
                      {user.name || user.email}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 animate-slide-up overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {user.name || 'User'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        <button
                          onClick={logout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden xl:flex items-center gap-2">
                  <Link to="/login" className="btn-secondary text-sm">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn text-sm">
                    Get started
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                type="button"
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all xl:hidden"
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileOpen && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 xl:hidden animate-slide-up">
            <div className="page-container py-4">
              {/* User info */}
              {user && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <Avatar name={user.name || user.email} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Nav links */}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {visibleNav.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <item.icon size={16} />
                    {item.label}
                  </NavLink>
                ))}
                {user && (
                  <NavLink
                    to="/create"
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Plus size={16} />
                    Create
                  </NavLink>
                )}
              </div>

              {/* Auth section */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {user ? (
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/login" className="btn-secondary flex-1 text-sm">
                      Sign in
                    </Link>
                    <Link to="/register" className="btn flex-1 text-sm">
                      Get started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── Main Content ────────────────────────── */}
      <main className="flex-1 page-container py-6 sm:py-8">
        <Outlet />
      </main>

      {/* ─── Bottom Nav (Mobile) ─────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md xl:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleNav.slice(0, 5).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
                }`
              }
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          {user ? (
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-all"
            >
              <Menu size={20} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-brand-500 transition-all"
            >
              <User size={20} />
              <span className="text-[10px] font-medium">Sign in</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 xl:hidden" />
    </div>
  )
}
