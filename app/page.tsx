'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { getTenantSlug } from '@/lib/tenant'
import { brandingService, type TenantBranding } from '@/lib/services/branding'
import {
  GraduationCap, Users, DollarSign, ClipboardList, BookOpen,
  BarChart3, ShieldCheck, Building2, FileText, ArrowRight, ChevronRight,
} from 'lucide-react'

const FEATURES = [
  { icon: Users,       title: 'HR & Payroll',         desc: 'Dynamic salary structures with named allowances and deductions. Every employee, every payslip.',         tag: 'Human Resources' },
  { icon: GraduationCap, title: 'Student Management', desc: 'Admissions, profiles, academic history, and parent linkage — one complete student record.',              tag: 'Academics' },
  { icon: ClipboardList, title: 'Attendance',          desc: 'Mark and review daily attendance for students and staff. Spot trends before they become problems.',       tag: 'Operations' },
  { icon: DollarSign,  title: 'Fee Management',        desc: 'Collect fees, generate receipts, and track outstanding balances without chasing spreadsheets.',           tag: 'Finance' },
  { icon: BarChart3,   title: 'Finance & Accounts',    desc: 'Budgets, expenses, and journal entries posted directly to your general ledger.',                          tag: 'Finance' },
  { icon: BookOpen,    title: 'Academics',              desc: 'Classes, subjects, timetables, and academic calendars built around your school year.',                   tag: 'Academics' },
  { icon: Building2,   title: 'Multi-branch',           desc: 'Manage multiple campuses under one account — shared settings, separate data.',                           tag: 'Platform' },
  { icon: ShieldCheck, title: 'Role-based Access',      desc: 'Principal, accountant, cashier, HR, teacher — each role sees exactly what they need.',                  tag: 'Security' },
  { icon: FileText,    title: 'Approvals & Receipts',   desc: 'Multi-step approval flows, audit trails, and receipts generated automatically.',                        tag: 'Operations' },
]


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
    const logoUrl = brandingService.logoUrl(slug!)
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
          .sl-footer { border-top: 1px solid var(--sidebar-border); padding: 18px 40px; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .sl-footer-txt { font-size: 12px; color: oklch(from var(--sidebar-foreground) l c h / 0.35); }
          .sl-footer-link { font-size: 12px; color: oklch(from var(--sidebar-foreground) l c h / 0.45); text-decoration: none; }
          .sl-footer-link:hover { color: var(--sidebar-primary); }
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
            <a href="https://muddir.com" target="_blank" rel="noopener noreferrer" className="sl-footer-link">
              Mudirr
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        .lp *, .lp *::before, .lp *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .lp { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

        /* ── SHARED ─────────────────────────────── */
        .lp-dark  { background: var(--sidebar); }
        .lp-light { background: var(--background); }

        /* ── NAV ────────────────────────────────── */
        .lp-nav {
          position: sticky; top: 0; z-index: 100;
          background: var(--sidebar);
          border-bottom: 1px solid var(--sidebar-border);
        }
        .lp-nav-in {
          max-width: 1200px; margin: 0 auto;
          padding: 0 40px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .lp-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .lp-brand-mark {
          width: 36px; height: 36px; border-radius: 8px;
          background: var(--sidebar-primary);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .lp-brand-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 22px; font-weight: 700;
          color: var(--sidebar-foreground); letter-spacing: -0.5px;
        }
        .lp-nav-login {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 22px;
          background: var(--sidebar-primary);
          color: var(--sidebar-primary-foreground);
          font-size: 14px; font-weight: 700;
          border-radius: 8px; text-decoration: none;
          transition: opacity 0.15s;
        }
        .lp-nav-login:hover { opacity: 0.88; }

        /* ── HERO ───────────────────────────────── */
        .lp-hero {
          background: var(--sidebar);
          padding: 100px 40px 88px;
        }
        .lp-hero-in {
          max-width: 1200px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 380px;
          gap: 64px; align-items: center;
        }
        .lp-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.13em; text-transform: uppercase;
          color: var(--sidebar-primary); margin-bottom: 24px;
        }
        .lp-eyebrow-pip {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--sidebar-primary); flex-shrink: 0;
        }
        .lp-h1 {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(52px, 6.5vw, 80px); font-weight: 800;
          line-height: 1.04; letter-spacing: -2.5px;
          color: var(--sidebar-foreground); margin-bottom: 24px;
        }
        .lp-h1 em {
          font-style: italic; font-weight: 700;
          color: var(--sidebar-primary);
        }
        .lp-hero-sub {
          font-size: 17px; line-height: 1.72;
          color: oklch(from var(--sidebar-foreground) l c h / 0.55);
          max-width: 500px; margin-bottom: 40px;
        }
        .lp-ctas { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .lp-cta-a {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px;
          background: var(--sidebar-primary);
          color: var(--sidebar-primary-foreground);
          font-size: 15px; font-weight: 700;
          border-radius: 10px; text-decoration: none;
          transition: opacity 0.15s, transform 0.1s;
        }
        .lp-cta-a:hover { opacity: 0.88; transform: translateY(-1px); }
        .lp-cta-b {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 14px 22px;
          border: 1px solid var(--sidebar-border);
          color: oklch(from var(--sidebar-foreground) l c h / 0.6);
          font-size: 14px; font-weight: 500;
          border-radius: 10px; text-decoration: none;
          transition: border-color 0.15s, color 0.15s;
        }
        .lp-cta-b:hover { border-color: var(--sidebar-primary); color: var(--sidebar-foreground); }

        /* ── HERO PREVIEW CARD ──────────────────── */
        .lp-pc {
          background: var(--sidebar-accent);
          border: 1px solid var(--sidebar-border);
          border-radius: 14px; overflow: hidden;
          position: relative;
        }
        .lp-pc::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: var(--sidebar-primary);
        }
        .lp-pc-head {
          padding: 16px 20px 12px;
          border-bottom: 1px solid var(--sidebar-border);
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase;
          color: oklch(from var(--sidebar-foreground) l c h / 0.45);
        }
        .lp-pc-body { padding: 14px 20px 16px; }

        /* Modules grid card */
        .lp-mod-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
        }
        .lp-mod-item {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 10px 4px; border-radius: 8px;
          background: oklch(from var(--sidebar-foreground) l c h / 0.04);
          text-decoration: none; cursor: pointer;
          transition: background 0.15s;
        }
        .lp-mod-item:hover { background: oklch(from var(--sidebar-primary) l c h / 0.12); }
        .lp-mod-item:hover .lp-mod-icon { background: oklch(from var(--sidebar-primary) l c h / 0.25); }
        .lp-mod-icon {
          width: 30px; height: 30px; border-radius: 7px;
          background: oklch(from var(--sidebar-primary) l c h / 0.15);
          display: flex; align-items: center; justify-content: center;
        }
        .lp-mod-label {
          font-size: 9px; font-weight: 600; letter-spacing: 0.04em;
          color: oklch(from var(--sidebar-foreground) l c h / 0.5);
          text-align: center; line-height: 1.3;
        }

        /* ── FEATURES ───────────────────────────── */
        .lp-feats {
          background: var(--background);
          padding: 96px 40px;
        }
        .lp-feats-in { max-width: 1200px; margin: 0 auto; }
        .lp-sec-eye {
          font-size: 11px; font-weight: 600; letter-spacing: 0.13em;
          text-transform: uppercase; color: var(--primary); margin-bottom: 14px;
        }
        .lp-sec-h {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(36px, 4vw, 54px); font-weight: 800;
          letter-spacing: -1.5px; line-height: 1.08;
          color: var(--foreground); margin-bottom: 52px; max-width: 520px;
        }
        .lp-sec-h em { font-style: italic; color: var(--primary); }
        .lp-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          border: 1px solid var(--border);
          border-radius: 16px; overflow: hidden;
          background: var(--border);
          gap: 1px;
        }
        .lp-card {
          background: var(--card);
          padding: 30px 26px;
          position: relative;
          transition: background 0.18s;
        }
        .lp-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 0;
          background: var(--primary);
          transition: height 0.2s;
        }
        .lp-card:hover { background: var(--background); }
        .lp-card:hover::before { height: 2px; }
        .lp-card-ico {
          width: 40px; height: 40px; border-radius: 9px;
          background: var(--muted);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
          transition: background 0.18s;
        }
        .lp-card:hover .lp-card-ico { background: var(--primary); }
        .lp-card:hover .lp-card-ico svg { color: var(--primary-foreground) !important; }
        .lp-card-title { font-size: 15px; font-weight: 700; color: var(--foreground); margin-bottom: 7px; }
        .lp-card-desc { font-size: 13.5px; line-height: 1.65; color: var(--muted-foreground); }
        .lp-card-tag {
          display: inline-block; margin-top: 14px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
          color: var(--muted-foreground); background: var(--muted);
          padding: 3px 8px; border-radius: 4px;
        }

        /* ── CTA SECTION ────────────────────────── */
        .lp-cta-sec {
          background: var(--sidebar);
          padding: 96px 40px;
          border-top: 1px solid var(--sidebar-border);
        }
        .lp-cta-sec-in {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; gap: 60px;
        }
        .lp-cta-h {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(36px, 4.5vw, 58px); font-weight: 800;
          letter-spacing: -2px; line-height: 1.07;
          color: var(--sidebar-foreground); max-width: 560px;
        }
        .lp-cta-h em { font-style: italic; color: var(--sidebar-primary); }
        .lp-cta-right { flex-shrink: 0; text-align: center; }
        .lp-cta-big {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 18px 36px;
          background: var(--sidebar-primary);
          color: var(--sidebar-primary-foreground);
          font-size: 16px; font-weight: 700;
          border-radius: 12px; text-decoration: none;
          transition: opacity 0.15s, transform 0.12s;
        }
        .lp-cta-big:hover { opacity: 0.88; transform: translateY(-2px); }
        .lp-cta-note {
          font-size: 12px; margin-top: 12px;
          color: oklch(from var(--sidebar-foreground) l c h / 0.4);
        }

        /* ── FOOTER ─────────────────────────────── */
        .lp-foot {
          background: var(--sidebar);
          border-top: 1px solid var(--sidebar-border);
          padding: 22px 40px;
        }
        .lp-foot-in {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; gap: 20px;
        }
        .lp-foot-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .lp-foot-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 16px; font-weight: 600; color: var(--sidebar-foreground);
        }
        .lp-foot-txt {
          font-size: 13px;
          color: oklch(from var(--sidebar-foreground) l c h / 0.4);
        }
        .lp-foot-link {
          font-size: 13px; font-weight: 600;
          color: var(--sidebar-primary); text-decoration: none;
          transition: opacity 0.15s;
        }
        .lp-foot-link:hover { opacity: 0.75; }

        /* ── RESPONSIVE ─────────────────────────── */
        @media (max-width: 960px) {
          .lp-hero-in { grid-template-columns: 1fr; }
          .lp-preview { display: none; }
          .lp-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-cta-sec-in { flex-direction: column; text-align: center; }
          .lp-foot-in { flex-direction: column; text-align: center; gap: 10px; }
        }
        @media (max-width: 600px) {
          .lp-hero { padding: 64px 24px 56px; }
          .lp-feats { padding: 64px 24px; }
          .lp-cta-sec { padding: 64px 24px; }
          .lp-foot, .lp-nav-in { padding-left: 24px; padding-right: 24px; }
          .lp-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="lp">

        {/* Nav */}
        <nav className="lp-nav">
          <div className="lp-nav-in">
            <div className="lp-brand">
              <div className="lp-brand-mark">
                <GraduationCap style={{ width: 20, height: 20, color: 'var(--sidebar-primary-foreground)' }} />
              </div>
              <span className="lp-brand-name">Mudirr</span>
            </div>
            {isSubdomain && (
              <Link href="/login" className="lp-nav-login">
                Login <ChevronRight style={{ width: 15, height: 15 }} />
              </Link>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-in">
            <div>
              <div className="lp-eyebrow">
                <span className="lp-eyebrow-pip" />
                School Management System
              </div>
              <h1 className="lp-h1">
                Manage smarter.<br />
                <em>Teach better.</em>
              </h1>
              <p className="lp-hero-sub">
                From HR and payroll to fees and attendance — Mudirr gives school administrators a complete, connected view of everything that matters.
              </p>
              <div className="lp-ctas">
                {isSubdomain && (
                  <Link href="/login" className="lp-cta-a">
                    Login to Dashboard
                    <ArrowRight style={{ width: 17, height: 17 }} />
                  </Link>
                )}
                <a href="#features" className="lp-cta-b">
                  Explore features
                </a>
              </div>
            </div>

            {/* Modules card — hidden on mobile */}
            <div className="lp-pc">
              <div className="lp-pc-head">Modules</div>
              <div className="lp-pc-body">
                <div className="lp-mod-grid">
                  {[
                    { icon: Users,         label: 'HR' },
                    { icon: DollarSign,    label: 'Finance' },
                    { icon: ClipboardList, label: 'Attendance' },
                    { icon: BookOpen,      label: 'Academics' },
                    { icon: GraduationCap, label: 'Students' },
                    { icon: FileText,      label: 'Fees' },
                    { icon: ShieldCheck,   label: 'Access' },
                    { icon: Building2,     label: 'Branches' },
                  ].map(m => (
                    <a key={m.label} href="#features" className="lp-mod-item">
                      <div className="lp-mod-icon">
                        <m.icon style={{ width: 15, height: 15, color: 'var(--sidebar-primary)' }} />
                      </div>
                      <span className="lp-mod-label">{m.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="lp-feats" id="features">
          <div className="lp-feats-in">
            <div className="lp-sec-eye">What's included</div>
            <h2 className="lp-sec-h">
              One platform.<br />
              <em>Every module</em><br />
              your school needs.
            </h2>
            <div className="lp-grid">
              {FEATURES.map(f => (
                <div key={f.title} className="lp-card">
                  <div className="lp-card-ico">
                    <f.icon style={{ width: 19, height: 19, color: 'var(--muted-foreground)' }} />
                  </div>
                  <div className="lp-card-title">{f.title}</div>
                  <div className="lp-card-desc">{f.desc}</div>
                  <span className="lp-card-tag">{f.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta-sec">
          <div className="lp-cta-sec-in">
            <h2 className="lp-cta-h">
              Your school is ready.<br />
              <em>Is your system?</em>
            </h2>
            <div className="lp-cta-right">
              {isSubdomain ? (
                <Link href="/login" className="lp-cta-big">
                  Login to Dashboard
                  <ArrowRight style={{ width: 18, height: 18 }} />
                </Link>
              ) : (
                <a href="mailto:hello@muddir.com" className="lp-cta-big">
                  Get in touch
                  <ArrowRight style={{ width: 18, height: 18 }} />
                </a>
              )}
              <div className="lp-cta-note">
                {isSubdomain ? 'All modules. One login.' : 'For schools ready to go digital.'}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-foot">
          <div className="lp-foot-in">
            <div className="lp-foot-brand">
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--sidebar-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap style={{ width: 16, height: 16, color: 'var(--sidebar-primary-foreground)' }} />
              </div>
              <span className="lp-foot-name">Mudirr</span>
            </div>
            <span className="lp-foot-txt">School Management System · © {new Date().getFullYear()}</span>
            {isSubdomain
              ? <Link href="/login" className="lp-foot-link">Login →</Link>
              : <a href="mailto:hello@muddir.com" className="lp-foot-link">Contact →</a>
            }
          </div>
        </footer>

      </div>
    </>
  )
}
