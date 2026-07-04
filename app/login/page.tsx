'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getTenantSlug } from '@/lib/tenant'
import { brandingService, type TenantBranding } from '@/lib/services/branding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, Loader2, Eye, EyeOff, Mail, Lock, BookOpen, DollarSign, Users, ClipboardList, ArrowRight } from 'lucide-react'

const FEATURES = [
  { icon: BookOpen, title: 'Academics', desc: 'Classes & timetables' },
  { icon: DollarSign, title: 'Finance', desc: 'Track fees & expenses' },
  { icon: Users, title: 'HR & Payroll', desc: 'Employee management' },
  { icon: ClipboardList, title: 'Attendance', desc: 'Track staff & students' },
]

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [branding, setBranding] = useState<TenantBranding | null>(null)

  useEffect(() => {
    const slug = getTenantSlug()
    if (!slug) {
      // No subdomain — this page is not accessible from the main domain
      router.replace('/')
      return
    }
    setTenantSlug(slug)
    brandingService.getPublicBranding(slug).then(setBranding)
  }, [router])

  const schoolName = branding?.name || tenantSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Mudir'
  const logoUrl = tenantSlug ? brandingService.logoUrl(tenantSlug, branding?.brandingUpdatedAt) : null
  const hasLogo = Boolean(branding?.logoUrl)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login({ email, password })

    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Invalid email or password')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-sidebar items-center justify-center p-12">
        {/* Decorative glow accents */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-sidebar-primary/10 blur-3xl" />

        <div className="relative z-10 max-w-md text-center">
          <div className="flex flex-col items-center gap-5 mb-8">
            {hasLogo ? (
              <img
                src={logoUrl!}
                alt={schoolName}
                className="w-16 h-16 rounded-2xl object-contain bg-sidebar-primary shadow-lg ring-1 ring-white/10"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-sidebar-primary flex items-center justify-center shadow-lg ring-1 ring-white/10">
                <GraduationCap className="w-8 h-8 text-sidebar-primary-foreground" />
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-sidebar-foreground">{schoolName}</h1>
          </div>
          <p className="text-base leading-relaxed text-sidebar-foreground/70 mb-10 max-w-sm mx-auto">
            {branding?.description || 'Comprehensive School Management System for modern educational institutions'}
          </p>
          <div className="grid grid-cols-2 gap-3 text-left">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4 transition-colors hover:bg-sidebar-accent/70"
              >
                <div className="w-9 h-9 rounded-lg bg-sidebar-primary/15 flex items-center justify-center mb-3">
                  <f.icon className="w-4 h-4 text-sidebar-primary" />
                </div>
                <div className="text-sm font-semibold text-sidebar-foreground mb-0.5">{f.title}</div>
                <div className="text-xs text-sidebar-foreground/60">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-background to-muted/30">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-6">
            {hasLogo ? (
              <img
                src={logoUrl!}
                alt={schoolName}
                className="w-14 h-14 rounded-2xl object-contain bg-primary shadow-md"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-md">
                <GraduationCap className="w-7 h-7 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-xl font-bold">{schoolName}</h1>
          </div>

          <Card className="rounded-2xl border-none shadow-xl shadow-black/5 py-0 overflow-hidden">
            <div className="h-1.5 bg-primary" />
            <CardHeader className="space-y-1 pt-7">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                {tenantSlug
                  ? <>Sign in to <span className="font-medium text-foreground">{schoolName}</span></>
                  : 'Enter your credentials to access your account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-7">
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="pl-9 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full group" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Contact your administrator if you have trouble signing in
          </p>
        </div>
      </div>
    </div>
  )
}
