'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/lib/services/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, Loader2, Eye, EyeOff, Lock, CheckCircle2, ShieldAlert } from 'lucide-react'

const RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'One uppercase letter', test: p => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: p => /[a-z]/.test(p) },
  { label: 'One number', test: p => /[0-9]/.test(p) },
  { label: 'One special character', test: p => /[^A-Za-z0-9]/.test(p) },
]

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const failedRules = RULES.filter(r => !r.test(password))
  const passwordValid = failedRules.length === 0
  const confirmValid = confirm.length > 0 && confirm === password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!passwordValid) { setError('Password does not meet the requirements below.'); return }
    if (!confirmValid) { setError('Passwords do not match.'); return }

    setIsSubmitting(true)
    const result = await authService.setPassword(token, password)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Failed to set password. The link may have expired — ask your administrator for a new invite.')
      return
    }
    setIsDone(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>Choose a password to activate your account</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                This link is missing its setup token. Open the link from your invitation email again, or ask your administrator to resend the invite.
              </AlertDescription>
            </Alert>
          ) : isDone ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="font-semibold text-lg">Password set successfully</p>
              <p className="text-sm text-muted-foreground">Taking you to the sign-in page…</p>
              <Button className="mt-2" onClick={() => router.push('/login')}>Go to Sign In</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`pl-9 ${confirm.length > 0 && !confirmValid ? 'border-destructive' : ''}`}
                  />
                </div>
                {confirm.length > 0 && !confirmValid && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>

              <ul className="space-y-1 rounded-lg border p-3">
                {RULES.map(rule => {
                  const ok = rule.test(password)
                  return (
                    <li key={rule.label} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${ok ? '' : 'opacity-30'}`} />
                      {rule.label}
                    </li>
                  )
                })}
              </ul>

              <Button type="submit" className="w-full" disabled={isSubmitting || !passwordValid || !confirmValid}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Set Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  )
}
