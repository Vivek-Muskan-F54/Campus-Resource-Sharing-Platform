import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Sun,
  Moon,
  ShoppingBag,
  BookOpen,
  Package,
  ShieldCheck,
  MessageCircle,
  LayoutDashboard,
  Plus,
  Home,
  LogOut,
  User,
  ChevronDown,
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
  const { toggleTheme, isDark } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  const visibleNav = useMemo(() => {
    const base = navItems.filter(item => !item.auth || !!user)
    return isAdmin ? [...base, { label: 'Admin', path: '/admin', icon: LayoutDashboard }] : base
  }, [user, isAdmin])

  const navClass = ({ isActive }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''}`

  return (
    <div className="bg-page flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/80 backdrop-blur-xl">
        <div className="page-container">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link
              to="/"
              className="group flex items-center gap-2.5 font-bold tracking-tight text-foreground"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105">
                <ShoppingBag size={16} className="text-white" />
              </div>
              <span className="hidden text-lg sm:block">
                Campus<span className="text-primary">Share</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface/80 p-1 shadow-sm backdrop-blur xl:flex">
              {visibleNav.map(item => (
                <NavLink key={item.path} to={item.path} end={item.exact} className={navClass}>
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {user && (
                <Link to="/create" className="hidden sm:flex btn gap-1.5 text-sm shadow-sm">
                  <Plus size={16} />
                  <span className="hidden md:inline">Create Listing</span>
                  <span className="inline md:hidden">New</span>
                </Link>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-2xl border border-border bg-surface/80 p-2.5 text-muted shadow-sm backdrop-blur hover:border-border-strong hover:bg-surface hover:text-foreground"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {user && <NotificationDropdown />}

              {user ? (
                <div className="relative hidden xl:block">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(v => !v)}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-surface/80 px-3 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur hover:border-border-strong hover:bg-surface"
                  >
                    <Avatar name={user.name || user.email} size="sm" />
                    <span className="hidden max-w-[100px] truncate lg:block">
                      {user.name || user.email}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {profileOpen && (
                    <div className="modal-surface absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden animate-slide-up">
                      <div className="border-b border-border bg-surface-elevated/70 px-4 py-3">
                        <p className="truncate font-semibold text-foreground">
                          {user.name || 'User'}
                        </p>
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        <button
                          onClick={logout}
                          className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft/70"
                        >
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden items-center gap-2 xl:flex">
                  <Link to="/login" className="btn-secondary text-sm">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn text-sm">
                    Get started
                  </Link>
                </div>
              )}

              <button
                type="button"
                className="rounded-2xl border border-border bg-surface/80 p-2.5 text-muted shadow-sm backdrop-blur hover:border-border-strong hover:bg-surface hover:text-foreground xl:hidden"
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border/80 bg-surface/90 shadow-xl xl:hidden animate-slide-up">
            <div className="page-container py-4">
              {user && (
                <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
                  <Avatar name={user.name || user.email} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {user.name || 'User'}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {visibleNav.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-primary-soft text-primary'
                          : 'text-muted hover:bg-surface-elevated hover:text-foreground'
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
                      `flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-primary-soft text-primary'
                          : 'text-muted hover:bg-surface-elevated hover:text-foreground'
                      }`
                    }
                  >
                    <Plus size={16} />
                    Create
                  </NavLink>
                )}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                {user ? (
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft/70"
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

      <main className="flex-1 page-container py-6 pb-24 sm:py-8 xl:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface/90 backdrop-blur-xl xl:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleNav.slice(0, 5).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 transition-all ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted hover:text-foreground'
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
              className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-muted transition-all hover:text-foreground"
            >
              <Menu size={20} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          ) : (
            <Link to="/login" className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-primary transition-all">
              <User size={20} />
              <span className="text-[10px] font-medium">Sign in</span>
            </Link>
          )}
        </div>
      </nav>

      <div className="h-16 xl:hidden" />
    </div>
  )
}
