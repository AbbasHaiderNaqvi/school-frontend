'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { getTenantSlug } from '@/lib/tenant'
import { brandingService, type TenantBranding } from '@/lib/services/branding'
import { tenantThemeStyle } from '@/lib/utils/theme'
import { formatAddress, hasContactInfo } from '@/lib/utils/contact'
import { useMapEmbedUrl } from '@/hooks/use-map-embed'
import { GraduationCap, ArrowRight, ChevronRight, MapPin, Phone, Mail } from 'lucide-react'


export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)
  const [schoolBranding, setSchoolBranding] = useState<TenantBranding | null>(null)
  const [brandingLoading, setBrandingLoading] = useState(false)
  const mapEmbedUrl = useMapEmbedUrl(schoolBranding?.address)

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
    const contact = schoolBranding?.contact
    const address = schoolBranding?.address
    const formattedAddress = formatAddress(address)
    const showContact = hasContactInfo(contact, address)

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
          .sl-contact { background: var(--background); padding: 80px 40px; }
          .sl-contact-in { max-width: 1080px; margin: 0 auto; }
          .sl-contact-eye { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sidebar-primary); text-align: center; margin-bottom: 10px; }
          .sl-contact-title { font-size: clamp(24px, 3vw, 34px); font-weight: 800; color: var(--foreground); text-align: center; letter-spacing: -0.5px; margin-bottom: 48px; }
          .sl-contact-wrap { display: grid; grid-template-columns: 1fr 1.3fr; gap: 56px; align-items: center; }
          .sl-contact-wrap.no-map { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
          .sl-contact-list { display: flex; flex-direction: column; gap: 28px; }
          .sl-contact-row { display: flex; gap: 16px; align-items: flex-start; }
          .sl-contact-icon { width: 46px; height: 46px; border-radius: 13px; background: oklch(from var(--sidebar-primary) l c h / 0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .sl-contact-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 5px; }
          .sl-contact-val { font-size: 15.5px; line-height: 1.5; color: var(--foreground); font-weight: 600; }
          .sl-contact-link { font-size: 13px; font-weight: 700; color: var(--sidebar-primary); text-decoration: none; display: inline-block; margin-top: 8px; }
          .sl-contact-link:hover { opacity: 0.8; }
          .sl-map {
            border-radius: 22px; overflow: hidden; border: 1px solid var(--border); height: 360px;
            box-shadow: 0 24px 64px -24px oklch(from var(--sidebar-primary) l c h / 0.35);
            position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; padding: 32px; text-decoration: none; cursor: pointer;
            background:
              radial-gradient(circle at 26% 22%, oklch(from var(--sidebar-primary) l c h / 0.20), transparent 55%),
              radial-gradient(circle at 82% 78%, oklch(from var(--sidebar-primary) l c h / 0.14), transparent 50%),
              linear-gradient(135deg, var(--muted), var(--card));
            transition: transform 0.15s;
          }
          .sl-map:hover { transform: translateY(-2px); }
          .sl-map-grid {
            position: absolute; inset: 0;
            background-image:
              linear-gradient(oklch(from var(--foreground) l c h / 0.05) 1px, transparent 1px),
              linear-gradient(90deg, oklch(from var(--foreground) l c h / 0.05) 1px, transparent 1px);
            background-size: 30px 30px;
          }
          .sl-map-pin {
            width: 60px; height: 60px; border-radius: 50%; background: var(--sidebar-primary);
            display: flex; align-items: center; justify-content: center; position: relative; z-index: 1;
            box-shadow: 0 14px 32px -8px oklch(from var(--sidebar-primary) l c h / 0.55); margin-bottom: 18px;
          }
          .sl-map-addr { font-size: 14.5px; font-weight: 600; color: var(--foreground); max-width: 320px; line-height: 1.5; margin-bottom: 20px; position: relative; z-index: 1; }
          .sl-map-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: var(--sidebar-primary); color: var(--sidebar-primary-foreground); font-size: 13.5px; font-weight: 700; border-radius: 10px; position: relative; z-index: 1; }
          .sl-map-frame { position: relative; border-radius: 22px; overflow: hidden; border: 1px solid var(--border); height: 360px; box-shadow: 0 24px 64px -24px oklch(from var(--sidebar-primary) l c h / 0.35); }
          .sl-map-frame iframe { width: 100%; height: 100%; border: 0; display: block; }
          .sl-map-frame-link { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: var(--sidebar-primary); color: var(--sidebar-primary-foreground); font-size: 13px; font-weight: 700; border-radius: 10px; text-decoration: none; box-shadow: 0 8px 24px -6px rgb(0 0 0 / 0.3); transition: opacity 0.15s; }
          .sl-map-frame-link:hover { opacity: 0.88; }
          @media (max-width: 860px) { .sl-map-frame { height: 260px; } }
          @media (max-width: 860px) { .sl-contact-wrap { grid-template-columns: 1fr; gap: 32px; } .sl-map { height: 260px; } }
          .sl-footer { border-top: 1px solid var(--sidebar-border); padding: 16px 40px; display: flex; align-items: center; justify-content: center; gap: 8px; }
          .sl-footer-txt { font-size: 13px; color: oklch(from var(--sidebar-foreground) l c h / 0.45); }
          .sl-footer-link { font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; }
          .sl-footer-link:hover { opacity: 0.8; }
          @media (max-width: 600px) { .sl-nav, .sl-footer { padding-left: 20px; padding-right: 20px; } .sl-hero { padding: 60px 24px; } .sl-contact { padding: 56px 24px; } }
        `}</style>

        <div className="sl" style={tenantThemeStyle(schoolBranding?.theme)}>
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

          {/* Contact */}
          {showContact && (
            <section className="sl-contact">
              <div className="sl-contact-in">
                <div className="sl-contact-eye">Get in touch</div>
                <h2 className="sl-contact-title">Visit or reach us</h2>
                <div className={`sl-contact-wrap${(mapEmbedUrl || address?.googleMapsUrl) ? '' : ' no-map'}`}>
                  <div className="sl-contact-list">
                    {formattedAddress && (
                      <div className="sl-contact-row">
                        <div className="sl-contact-icon">
                          <MapPin style={{ width: 20, height: 20, color: 'var(--sidebar-primary)' }} />
                        </div>
                        <div>
                          <div className="sl-contact-label">Address</div>
                          <div className="sl-contact-val">{formattedAddress}</div>
                          {address?.googleMapsUrl && (
                            <a href={address.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="sl-contact-link">
                              Get directions →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {(contact?.phone || contact?.whatsapp) && (
                      <div className="sl-contact-row">
                        <div className="sl-contact-icon">
                          <Phone style={{ width: 20, height: 20, color: 'var(--sidebar-primary)' }} />
                        </div>
                        <div>
                          <div className="sl-contact-label">Phone</div>
                          {contact?.phone && <div className="sl-contact-val">{contact.phone}</div>}
                          {contact?.whatsapp && (
                            <a
                              href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="sl-contact-link"
                            >
                              WhatsApp →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {(contact?.email || contact?.websiteUrl) && (
                      <div className="sl-contact-row">
                        <div className="sl-contact-icon">
                          <Mail style={{ width: 20, height: 20, color: 'var(--sidebar-primary)' }} />
                        </div>
                        <div>
                          <div className="sl-contact-label">Email</div>
                          {contact?.email && <div className="sl-contact-val">{contact.email}</div>}
                          {contact?.websiteUrl && (
                            <a href={contact.websiteUrl} target="_blank" rel="noopener noreferrer" className="sl-contact-link">
                              Visit website →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {mapEmbedUrl ? (
                    <div className="sl-map-frame">
                      <iframe src={mapEmbedUrl} loading="lazy" title={`Map showing ${schoolName}`} />
                      {address?.googleMapsUrl && (
                        <a href={address.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="sl-map-frame-link">
                          Open in Google Maps
                          <ArrowRight style={{ width: 14, height: 14 }} />
                        </a>
                      )}
                    </div>
                  ) : address?.googleMapsUrl ? (
                    <a href={address.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="sl-map">
                      <div className="sl-map-grid" />
                      <div className="sl-map-pin">
                        <MapPin style={{ width: 26, height: 26, color: 'var(--sidebar-primary-foreground)' }} />
                      </div>
                      {formattedAddress && <div className="sl-map-addr">{formattedAddress}</div>}
                      <span className="sl-map-btn">
                        Open in Google Maps
                        <ArrowRight style={{ width: 15, height: 15 }} />
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          )}

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
          color: #ffffff;
          text-decoration: none;
        }
        .cs-credit a:hover { opacity: 0.8; }
      `}</style>

      <div className="cs" style={{ position: 'relative' }}>
        <div className="cs-title">MUDDIR</div>
        <div className="cs-sub">Coming soon</div>
        <div className="cs-credit">
          Powered by <a href="https://www.techneedllc.com/" target="_blank" rel="noopener noreferrer">Techneed</a>
        </div>
      </div>
    </>
  )
}
