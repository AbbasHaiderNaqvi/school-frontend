'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { getTenantSlug } from '@/lib/tenant'
import { brandingService, type TenantBranding } from '@/lib/services/branding'
import { GraduationCap, ArrowRight, ChevronRight } from 'lucide-react'


export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)
  const [schoolBranding, setSchoolBranding] = useState<TenantBranding | null>(null)
  const [brandingLoading, setBrandingLoading] = useState(false)

  // Detect subdomain once on the client
  useEffect(() => {
    setSlug(getTenantSlug())
  }, [])

  // Fetch school branding when on a subdomain
  useEffect(() => {
    if (!slug) return
    setBrandingLoading(true)
    brandingService.getPublicBranding(slug).then(data => {
      setSchoolBranding(data)
      setBrandingLoading(false)
    })
  }, [slug])

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/dashboard')
  }, [isLoading, isAuthenticated, router])

  const isSubdomain = slug !== null

  if (isLoading || (isSubdomain && brandingLoading)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'oklch(0.17 0.02 250)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'oklch(0.55 0.18 250)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite' }}>
          <GraduationCap style={{ width: 28, height: 28, color: '#fff' }} />
        </div>
      </div>
    )
  }

  if (isAuthenticated) return null

  // ── School subdomain landing page ─────────────────────────────────────────
  if (isSubdomain) {
    const logoUrl = brandingService.logoUrl(slug!, schoolBranding?.brandingUpdatedAt)
    const schoolName = schoolBranding?.name || slug!.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const description = schoolBranding?.description || 'Powered by Mudirr School Management System'

    return (
      <>
        <style>{`
          .sl *, .sl *::before, .sl *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .sl { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; display: flex; flex-direction: column; background: var(--sidebar); }
          .sl-nav { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--sidebar-border); padding: 0 40px; height: 60px; display: flex; align-items: center; justify-content: space-between; background: var(--sidebar); }
          .sl-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
          .sl-logo-sm { height: 32px; width: 32px; border-radius: 8px; object-fit: contain; }
          .sl-logo-fallback { height: 32px; width: 32px; border-radius: 8px; background: var(--sidebar-primary); display: flex; align-items: center; justify-content: center; }
          .sl-name-sm { font-size: 16px; font-weight: 700; color: var(--sidebar-foreground); letter-spacing: -0.3px; }
          .sl-login-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; background: var(--sidebar-primary); color: var(--sidebar-primary-foreground); font-size: 14px; font-weight: 700; border-radius: 8px; text-decoration: none; transition: opacity 0.15s; }
          .sl-login-btn:hover { opacity: 0.88; }
          .sl-hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; text-align: center; }
          .sl-logo-wrap { margin-bottom: 32px; }
          .sl-logo-lg { height: 96px; max-width: 240px; object-fit: contain; }
          .sl-logo-fallback-lg { height: 96px; width: 96px; border-radius: 20px; background: var(--sidebar-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto; }
          .sl-h1 { font-size: clamp(32px, 5vw, 56px); font-weight: 800; color: var(--sidebar-foreground); letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 16px; max-width: 600px; }
          .sl-sub { font-size: 17px; line-height: 1.7; color: oklch(from var(--sidebar-foreground) l c h / 0.55); max-width: 480px; margin: 0 auto 40px; }
          .sl-cta { display: inline-flex; align-items: center; gap: 8px; padding: 16px 36px; background: var(--sidebar-primary); color: var(--sidebar-primary-foreground); font-size: 16px; font-weight: 700; border-radius: 12px; text-decoration: none; transition: opacity 0.15s, transform 0.1s; }
          .sl-cta:hover { opacity: 0.88; transform: translateY(-1px); }
          .sl-footer { border-top: 1px solid var(--sidebar-border); padding: 16px 40px; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .sl-footer-txt { font-size: 13px; color: oklch(from var(--sidebar-foreground) l c h / 0.45); }
          .sl-footer-link { font-size: 13px; font-weight: 700; color: var(--sidebar-primary); text-decoration: none; }
          .sl-footer-link:hover { opacity: 0.8; }
          @media (max-width: 600px) { .sl-nav, .sl-footer { padding-left: 20px; padding-right: 20px; } .sl-hero { padding: 60px 24px; } }
        `}</style>

        <div className="sl">
          {/* Nav */}
          <nav className="sl-nav">
            <div className="sl-brand">
              {schoolBranding?.logoUrl ? (
                <img src={logoUrl} alt={schoolName} className="sl-logo-sm" onError={e => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className="sl-logo-fallback">
                  <GraduationCap style={{ width: 18, height: 18, color: 'var(--sidebar-primary-foreground)' }} />
                </div>
              )}
              <span className="sl-name-sm">{schoolName}</span>
            </div>
            <Link href="/login" className="sl-login-btn">
              Login <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          </nav>

          {/* Hero */}
          <section className="sl-hero">
            <div className="sl-logo-wrap">
              {schoolBranding?.logoUrl ? (
                <img src={logoUrl} alt={schoolName} className="sl-logo-lg" onError={e => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className="sl-logo-fallback-lg">
                  <GraduationCap style={{ width: 48, height: 48, color: 'var(--sidebar-primary-foreground)' }} />
                </div>
              )}
            </div>

            <h1 className="sl-h1">{schoolName}</h1>
            <p className="sl-sub">{description}</p>

            <Link href="/login" className="sl-cta">
              Login to Dashboard
              <ArrowRight style={{ width: 17, height: 17 }} />
            </Link>
          </section>

          {/* Footer */}
          <footer className="sl-footer">
            <span className="sl-footer-txt">Powered by</span>
            <a href="https://www.techneedllc.com/" target="_blank" rel="noopener noreferrer" className="sl-footer-link">
              Techneed
            </a>
          </footer>
        </div>
      </>
    )
  }

  // ── Main domain landing page ───────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,800&display=swap');

        .cs {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: var(--sidebar);
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .cs-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(56px, 13vw, 160px); font-weight: 800;
          letter-spacing: -3px; line-height: 1;
          color: var(--sidebar-foreground);
        }
        .cs-sub {
          margin-top: 24px;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.35em; text-transform: uppercase;
          color: oklch(from var(--sidebar-foreground) l c h / 0.45);
        }
        .cs-credit {
          position: absolute; bottom: 36px;
          font-size: 15px; font-weight: 500;
          color: oklch(from var(--sidebar-foreground) l c h / 0.5);
        }
        .cs-credit a {
          font-weight: 700;
          color: var(--sidebar-primary);
          text-decoration: none;
        }
        .cs-credit a:hover { opacity: 0.8; }
      `}</style>

      <div className="cs" style={{ position: 'relative' }}>
        <div className="cs-title">MUDDIR</div>
        <div className="cs-sub">Coming soon</div>
        <div className="cs-credit">
          Powered by <a href="https://www.techneedllc.com/" target="_blank" rel="noopener noreferrer">Technseed</a>
        </div>
      </div>
    </>
  )
}
