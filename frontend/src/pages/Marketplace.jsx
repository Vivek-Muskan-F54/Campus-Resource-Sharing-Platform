import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Heart,
  Layers3,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react'
import { categoryApi, listingApi, noteApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import ListingCard from '../components/ListingCard'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'

const FEATURES = [
  {
    icon: Search,
    title: 'Fast discovery',
    description: 'Find listings and resources with a clean, campus-first browsing flow built for quick decisions.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted sharing',
    description: 'Verification-backed profiles and moderated notes keep the marketplace reliable and student-friendly.',
  },
  {
    icon: Zap,
    title: 'Instant access',
    description: 'Browse, save, and request items with a crisp interface that stays lightweight on mobile and desktop.',
  },
  {
    icon: Layers3,
    title: 'One shared hub',
    description: 'Marketplace, notes, orders, and chat live under one consistent brand experience.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Ananya Rao',
    role: 'CSE student',
    quote: 'CampusShare feels like a polished product, not just a college portal. I found books and lab gear in minutes.',
    rating: 5,
  },
  {
    name: 'Rahul Mehta',
    role: 'Marketplace seller',
    quote: 'The layout makes my listings look premium, and students actually respond faster because the experience is so clear.',
    rating: 5,
  },
  {
    name: 'Sara Khan',
    role: 'Notes contributor',
    quote: 'The notes side is easy to browse and the platform feels cohesive across resources, which is a big win.',
    rating: 4,
  },
]

const FAQS = [
  {
    question: 'How does CampusShare work?',
    answer: 'Students can browse listings and notes, save items, request products, and share useful resources inside one unified platform.',
  },
  {
    question: 'Do I need to verify my account?',
    answer: 'Verification is required for sensitive actions like posting certain marketplace items so the community stays trusted.',
  },
  {
    question: 'Can I upload notes from my phone?',
    answer: 'Yes. The interface is responsive, so uploads, browsing, and downloads all work smoothly on mobile devices.',
  },
  {
    question: 'Is the platform fast?',
    answer: 'The landing page keeps data requests light and only loads a small number of live items for a quick first paint.',
  },
]

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function HeroStat({ label, value, icon: Icon }) {
  return (
    <div className="hero-metric border-white/10 bg-white/10 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-2.5 text-white ring-1 ring-white/15">
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl space-y-3">
      <Badge variant="brand" className="gap-1.5">
        <Sparkles size={10} />
        {eyebrow}
      </Badge>
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
      <p className="text-sm leading-6 text-muted sm:text-base">{description}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="card group overflow-hidden">
      <div className="mb-4 inline-flex rounded-2xl bg-primary-soft p-3 text-primary shadow-sm transition-transform group-hover:scale-105">
        <Icon size={20} />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  )
}

function TestimonialCard({ name, role, quote, rating }) {
  return (
    <div className="card h-full">
      <div className="flex items-center gap-3">
        <Avatar name={name} size="lg" />
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted">{role}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-warning">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={14}
            fill={index < rating ? 'currentColor' : 'none'}
            className={index < rating ? 'text-warning' : 'text-border-strong'}
          />
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">"{quote}"</p>
    </div>
  )
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="font-semibold text-foreground">{item.question}</span>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-6 text-muted">{item.answer}</div>
      )}
    </div>
  )
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-sm text-muted transition-colors hover:text-primary"
    >
      {children}
    </Link>
  )
}

export default function Marketplace() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [heroStats, setHeroStats] = useState({
    listings: 0,
    notes: 0,
    categories: 0,
    highlights: 0,
  })
  const [featuredListings, setFeaturedListings] = useState([])
  const [featuredNotes, setFeaturedNotes] = useState([])
  const [faqOpen, setFaqOpen] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [listingRes, noteRes, categoryRes] = await Promise.all([
          listingApi.search({ status: 'ACTIVE', page: 0, size: 4, sort: 'createdAt,desc' }),
          noteApi.all({ page: 0, size: 4, sort: 'createdAt,desc' }),
          categoryApi.all(),
        ])

        if (cancelled) return

        const listingData = listingRes.data || {}
        const noteData = noteRes.data || {}
        const featuredProducts = listingData.content || []
        const featuredStudyNotes = noteData.content || []

        setFeaturedListings(featuredProducts)
        setFeaturedNotes(featuredStudyNotes)
        setHeroStats({
          listings: listingData.totalElements ?? featuredProducts.length,
          notes: noteData.totalElements ?? featuredStudyNotes.length,
          categories: (categoryRes.data?.content || categoryRes.data || []).length,
          highlights: featuredProducts.length + featuredStudyNotes.length,
        })
      } catch {
        if (!cancelled) {
          setFeaturedListings([])
          setFeaturedNotes([])
          setHeroStats({ listings: 0, notes: 0, categories: 0, highlights: 0 })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const quickLinks = useMemo(
    () => [
      { label: 'Marketplace', to: '/' },
      { label: 'Notes', to: '/notes' },
      { label: 'Orders', to: '/orders' },
      { label: 'Verification', to: '/verification' },
      { label: 'Chat', to: '/chat' },
    ],
    []
  )

  return (
    <div className="space-y-20 pb-10">
      <section className="hero-panel px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="brand" className="gap-1.5">
              <Sparkles size={10} />
              CampusShare platform
            </Badge>
            <div className="space-y-4">
              <h1 className="hero-title max-w-3xl">
                A premium campus marketplace for sharing, learning, and moving faster together.
              </h1>
              <p className="hero-copy">
                Buy and rent what you need, share study notes, and keep the entire student ecosystem in one polished, responsive experience.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Link to="/create" className="btn h-12 gap-2 rounded-2xl px-5">
                  List an item
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/register" className="btn h-12 gap-2 rounded-2xl px-5">
                  Get started
                  <ArrowRight size={16} />
                </Link>
              )}
              <a href="#featured" className="btn-secondary h-12 gap-2 rounded-2xl px-5">
                Explore featured
                <Search size={16} />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroStat label="Active listings" value={formatCount(heroStats.listings)} icon={Package} />
              <HeroStat label="Study notes" value={formatCount(heroStats.notes)} icon={BookOpen} />
              <HeroStat label="Categories" value={formatCount(heroStats.categories)} icon={Layers3} />
              <HeroStat label="Highlights" value={formatCount(heroStats.highlights)} icon={Zap} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Live snapshot</p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">Community pulse</h2>
                </div>
                <div className="rounded-2xl bg-primary-soft p-3 text-primary">
                  <Sparkles size={18} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-border bg-surface-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Marketplace activity</p>
                  <p className="mt-2 text-2xl font-bold">{formatCount(heroStats.listings)}</p>
                  <p className="mt-1 text-sm text-muted">Fresh listings waiting to be discovered.</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Study resources</p>
                  <p className="mt-2 text-2xl font-bold">{formatCount(heroStats.notes)}</p>
                  <p className="mt-1 text-sm text-muted">Public notes ready for quick preview and download.</p>
                </div>
              </div>
            </div>

            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why it works</p>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  Built for quick browsing on mobile and desktop
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  Reuses the same brand language across the platform
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  Loads only a small live preview set for fast initial render
                </li>
              </ul>
              <div className="mt-5 rounded-2xl bg-surface-elevated p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">CampusShare</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Premium UI, verified community signals, and one shared place for resource exchange.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Statistics"
          title="A quick pulse on what the campus is sharing"
          description="Live counts from the platform give the landing page a data-backed feel without loading heavy content."
        />
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="card animate-pulse space-y-3">
                <div className="skeleton h-8 w-8 rounded-2xl" />
                <div className="skeleton h-8 w-20 rounded-xl" />
                <div className="skeleton h-3 w-28 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Listings</p>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {formatCount(heroStats.listings)}
              </p>
              <p className="mt-1 text-sm text-muted">Active marketplace opportunities</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Notes</p>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {formatCount(heroStats.notes)}
              </p>
              <p className="mt-1 text-sm text-muted">Public study PDFs ready to preview</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Categories</p>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {formatCount(heroStats.categories)}
              </p>
              <p className="mt-1 text-sm text-muted">Browse across campus needs</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Highlights</p>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {formatCount(heroStats.highlights)}
              </p>
              <p className="mt-1 text-sm text-muted">Featured items on the landing page</p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Feature showcase"
          title="Everything students need, presented with a premium SaaS feel"
          description="A more intentional interface helps students move from discovery to action without friction."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map(feature => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section id="featured" className="space-y-6">
        <SectionHeading
          eyebrow="Featured marketplace"
          title="Live listings from the campus marketplace"
          description="A small, curated set of active listings keeps the landing page fast while still showing real inventory."
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : featuredListings.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featuredListings.map(item => (
              <ListingCard key={item.id} item={item} user={user} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="No featured listings right now"
            description="Listings will appear here as soon as active marketplace items are available."
            action={
              <Link to={user ? '/create' : '/register'} className="btn gap-2">
                {user ? 'Create a listing' : 'Get started'}
                <ArrowRight size={14} />
              </Link>
            }
          />
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Testimonials"
          title="Students get a cleaner experience, and it shows"
          description="A polished interface helps users trust the platform and move more confidently through each resource."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map(testimonial => (
            <TestimonialCard key={testimonial.name} {...testimonial} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionHeading
          eyebrow="FAQ"
          title="Common questions, answered clearly"
          description="A focused FAQ helps first-time visitors understand how CampusShare fits into the student workflow."
        />
        <div className="space-y-3">
          {FAQS.map((item, index) => (
            <FaqItem
              key={item.question}
              item={item}
              open={faqOpen === index}
              onToggle={() => setFaqOpen(faqOpen === index ? -1 : index)}
            />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[32px] border border-border bg-surface px-6 py-10 shadow-xl sm:px-8 lg:px-10">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -left-8 top-0 h-52 w-52 rounded-full bg-primary-soft/30 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-primary-soft/40 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Call to action</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to share resources with a smoother, more modern campus experience?
            </h2>
            <p className="text-sm leading-7 text-muted sm:text-base">
              Start browsing now, or post your own listing when you are ready to contribute back to the community.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={user ? '/create' : '/register'} className="btn h-12 gap-2 rounded-2xl px-5">
              {user ? 'Create a listing' : 'Get started'}
              <ArrowRight size={16} />
            </Link>
            <Link to="/notes" className="btn-secondary h-12 gap-2 rounded-2xl px-5">
              Browse notes
            </Link>
          </div>
        </div>
      </section>

      <footer className="rounded-[28px] border border-border bg-surface px-6 py-8 shadow-sm sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary">
                <Heart size={18} className="text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">CampusShare</p>
                <p className="text-xs text-muted">Shared campus resources, beautifully organized.</p>
              </div>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted">
              A premium student marketplace for listings, notes, verification, orders, and conversations.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Explore</p>
            <div className="mt-3 flex flex-col gap-2">
              {quickLinks.map(link => (
                <FooterLink key={link.to} to={link.to}>
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Account</p>
            <div className="mt-3 flex flex-col gap-2">
              <FooterLink to="/login">Sign in</FooterLink>
              <FooterLink to="/register">Create account</FooterLink>
              <FooterLink to="/verification">Verification</FooterLink>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Quick note</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Built to load quickly, scale cleanly, and keep the brand consistent across the platform.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {new Date().getFullYear()} CampusShare. All rights reserved.</p>
          <p>Designed for a fast, mobile-friendly campus resource exchange.</p>
        </div>
      </footer>
    </div>
  )
}
