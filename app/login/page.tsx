'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getTenantSlug } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)

  useEffect(() => {
    const slug = getTenantSlug()
    if (!slug) {
      // No subdomain — this page is not accessible from the main domain
      router.replace('/')
      return
    }
    setTenantSlug(slug)
  }, [router])

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
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-sidebar-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-sidebar-foreground">Mudir</h1>
          </div>
          <p className="text-lg text-sidebar-foreground/80 mb-8">
            Comprehensive School Management System for modern educational institutions
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm text-sidebar-foreground/70">
            <div className="bg-sidebar-accent/50 rounded-lg p-4">
              <div className="font-semibold text-sidebar-foreground mb-1">Multi-Tenant</div>
              <div>Manage multiple schools</div>
            </div>
            <div className="bg-sidebar-accent/50 rounded-lg p-4">
              <div className="font-semibold text-sidebar-foreground mb-1">Finance</div>
              <div>Track fees & expenses</div>
            </div>
            <div className="bg-sidebar-accent/50 rounded-lg p-4">
              <div className="font-semibold text-sidebar-foreground mb-1">HR & Payroll</div>
              <div>Employee management</div>
            </div>
            <div className="bg-sidebar-accent/50 rounded-lg p-4">
              <div className="font-semibold text-sidebar-foreground mb-1">Attendance</div>
              <div>Track staff & students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Mudir</h1>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                {tenantSlug
                  ? <>Signing in to <span className="font-medium text-foreground">{tenantSlug}</span></>
                  : 'Enter your credentials to access your account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
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
