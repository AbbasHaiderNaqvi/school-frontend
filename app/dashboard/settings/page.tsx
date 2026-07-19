'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { tenantService, authService } from '@/lib/services'
import { brandingService, type TenantBranding } from '@/lib/services/branding'
import { AccessControlPanel } from '@/components/settings/access-control-panel'
import { currencyService, CURRENCIES } from '@/lib/utils/currency'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { getInitials } from '@/lib/utils'
import { emailError, phoneError, hasNoErrors } from '@/lib/validation'
import { ACADEMIC_YEARS } from '@/lib/academic-years'
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  MessageCircle,
  Send,
  Printer,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Bell,
  Save,
  Loader2,
  Upload,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react'

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-11 rounded-md border cursor-pointer shrink-0"
        />
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="#4F46E5" className="font-mono" />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, tenant } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const isAdmin = ['super_admin', 'tenant_owner', 'tenant_admin', 'tenant_principal'].includes(user?.role || '')
  const isOwner = user?.role === 'tenant_owner'

  // Organization form — everything here saves through the single /tenant/branding
  // endpoint, so it's kept as one form with one save action rather than split
  // across several disconnected mini-forms.
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    websiteUrl: '',
    fax: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    googleMapsUrl: '',
    primaryColor: '',
    secondaryColor: '',
    backgroundColor: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Settings state
  const [settings, setSettings] = useState({
    academicYear: '2025-2026',
    currency: 'USD',
    timezone: 'UTC',
    expenseApprovalThreshold: 1000,
    expenseApprovalEnabled: true,
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    feeReminders: true,
    attendanceAlerts: true,
    taskAssignments: true,
    systemUpdates: false,
  })

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      })
    }
    if (tenant) {
      setOrgForm(prev => ({ ...prev, name: prev.name || tenant.name }))
    }
  }, [user, tenant])

  // Load organization profile on mount (admin roles only)
  useEffect(() => {
    if (!isAdmin) return
    brandingService.getBranding().then(data => {
      if (!data) return
      setBranding(data)
      setOrgForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || '',
        email: data.contact?.email || '',
        phone: data.contact?.phone || '',
        whatsapp: data.contact?.whatsapp || '',
        telegram: data.contact?.telegram || '',
        websiteUrl: data.contact?.websiteUrl || '',
        fax: data.contact?.fax || '',
        addressLine1: data.address?.line1 || '',
        addressLine2: data.address?.line2 || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        postalCode: data.address?.postalCode || '',
        country: data.address?.country || '',
        googleMapsUrl: data.address?.googleMapsUrl || '',
        primaryColor: data.theme?.primaryColor || '',
        secondaryColor: data.theme?.secondaryColor || '',
        backgroundColor: data.theme?.backgroundColor || '',
      }))
      if (data.logoUrl) setLogoPreview(data.logoUrl)
      if (data.faviconUrl) setFaviconPreview(data.faviconUrl)
    })
  }, [isAdmin])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setOrgError('Logo must be under 2 MB.')
      e.target.value = ''
      return
    }
    setOrgError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 256 * 1024) {
      setOrgError('Favicon must be under 256 KB.')
      e.target.value = ''
      return
    }
    setOrgError(null)
    setFaviconFile(file)
    setFaviconPreview(URL.createObjectURL(file))
  }

  const handleDeleteLogo = async () => {
    await brandingService.deleteLogo()
    setLogoFile(null)
    setLogoPreview(null)
    setBranding(prev => prev ? { ...prev, logoUrl: null } : null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleDeleteFavicon = async () => {
    await brandingService.deleteFavicon()
    setFaviconFile(null)
    setFaviconPreview(null)
    setBranding(prev => prev ? { ...prev, faviconUrl: null } : null)
    if (faviconInputRef.current) faviconInputRef.current.value = ''
  }

  const validateOrgForm = (): boolean => {
    const errors: Record<string, string> = {}
    const emailErr = emailError(orgForm.email, false)
    if (emailErr) errors.email = emailErr
    const phoneErr = phoneError(orgForm.phone, false)
    if (phoneErr) errors.phone = phoneErr
    const whatsappErr = phoneError(orgForm.whatsapp, false)
    if (whatsappErr) errors.whatsapp = whatsappErr
    const faxErr = phoneError(orgForm.fax, false)
    if (faxErr) errors.fax = faxErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSaveOrganization = async () => {
    if (!validateOrgForm()) return
    setIsSavingOrg(true)
    setOrgSaved(false)
    setOrgError(null)
    const result = await brandingService.updateBranding({
      name: orgForm.name,
      description: orgForm.description,
      email: orgForm.email || undefined,
      phone: orgForm.phone || undefined,
      whatsapp: orgForm.whatsapp || undefined,
      telegram: orgForm.telegram || undefined,
      websiteUrl: orgForm.websiteUrl || undefined,
      fax: orgForm.fax || undefined,
      addressLine1: orgForm.addressLine1 || undefined,
      addressLine2: orgForm.addressLine2 || undefined,
      city: orgForm.city || undefined,
      state: orgForm.state || undefined,
      postalCode: orgForm.postalCode || undefined,
      country: orgForm.country || undefined,
      googleMapsUrl: orgForm.googleMapsUrl || undefined,
      theme: {
        primaryColor: orgForm.primaryColor || undefined,
        secondaryColor: orgForm.secondaryColor || undefined,
        backgroundColor: orgForm.backgroundColor || undefined,
      },
      logo: logoFile,
      favicon: faviconFile,
    })
    if (result.success) {
      setLogoFile(null)
      setFaviconFile(null)
      if (result.data?.logoUrl) setLogoPreview(result.data.logoUrl)
      if (result.data?.faviconUrl) setFaviconPreview(result.data.faviconUrl)
      setOrgSaved(true)
      setTimeout(() => setOrgSaved(false), 3000)
    } else {
      setOrgError(result.error || 'Failed to save organization details.')
    }
    setIsSavingOrg(false)
  }

  const handleSaveProfile = async () => {
    setProfileError('')
    setProfileSaved(false)
    if (!profileData.name.trim()) { setProfileError('Full name is required.'); return }
    const phoneErr = phoneError(profileData.phone, false)
    if (phoneErr) { setProfileError(phoneErr); return }
    setIsSaving(true)
    const result = await authService.updateProfile({
      fullName: profileData.name.trim(),
      phone: profileData.phone.trim() || undefined,
    })
    setIsSaving(false)
    if (!result.success) {
      setProfileError(result.error || 'Failed to update profile.')
      return
    }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const handleSavePassword = async () => {
    setPasswordError('')
    setPasswordSaved(false)
    if (!passwordData.currentPassword) {
      setPasswordError('Current password is required.')
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    setIsSaving(true)
    const result = await authService.changePassword(passwordData.currentPassword, passwordData.newPassword)
    setIsSaving(false)
    if (!result.success) {
      setPasswordError(result.error || 'Failed to update password. Check your current password.')
      return
    }
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  const handleSaveSettings = async () => {
    if (!tenant) return
    setIsSaving(true)
    await tenantService.updateSettings(tenant.id, settings)
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and organization settings"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="settings" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              System
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="access-control" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Access Control
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your name and phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileError && <Alert variant="destructive"><AlertDescription>{profileError}</AlertDescription></Alert>}
              {profileSaved && <Alert><AlertDescription>Profile updated.</AlertDescription></Alert>}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(profileData.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">{profileData.name}</h3>
                  <Badge variant="secondary" className="capitalize">
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={e => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={e => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+92 300 0000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordError && <Alert variant="destructive"><AlertDescription>{passwordError}</AlertDescription></Alert>}
              {passwordSaved && <Alert><AlertDescription>Password updated successfully.</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSavePassword} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Manage your active sessions and devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Current Session</p>
                    <p className="text-sm text-muted-foreground">Browser - Active now</p>
                  </div>
                </div>
                <Badge variant="secondary">This Device</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="organization" className="space-y-6">

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Your school's name, subdomain, and public description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={orgForm.name}
                      onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomain</Label>
                    <div className="flex">
                      <Input
                        id="subdomain"
                        value={tenant?.slug || ''}
                        disabled
                        className="rounded-r-none bg-muted text-muted-foreground"
                      />
                      <span className="inline-flex items-center px-3 border border-l-0 rounded-r-md bg-muted text-muted-foreground text-sm">
                        .muddir.com
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Subdomain cannot be changed</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-description">School Description</Label>
                  <Textarea
                    id="org-description"
                    placeholder="A brief tagline shown on your public landing page…"
                    value={orgForm.description}
                    onChange={e => setOrgForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Branding — tenant owner only */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>Logo and favicon shown on your public page and browser tab</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Logo */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">School Logo</Label>
                    <div className="flex items-start gap-6">
                      <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">PNG or SVG, at least 256×256px, max 2 MB.</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-2" />
                            {logoPreview ? 'Replace' : 'Upload Logo'}
                          </Button>
                          {logoPreview && (
                            <Button variant="ghost" size="sm" onClick={handleDeleteLogo}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        {logoFile && <p className="text-xs text-primary">{logoFile.name} — ready to save</p>}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Favicon */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Favicon</Label>
                    <div className="flex items-start gap-6">
                      <div className="h-10 w-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                        {faviconPreview ? (
                          <img src={faviconPreview} alt="Favicon" className="h-full w-full object-contain" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">ICO, PNG, or SVG at 32×32px, max 256 KB.</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-2" />
                            {faviconPreview ? 'Replace' : 'Upload Favicon'}
                          </Button>
                          {faviconPreview && (
                            <Button variant="ghost" size="sm" onClick={handleDeleteFavicon}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <input ref={faviconInputRef} type="file" accept="image/*,.ico" className="hidden" onChange={handleFaviconChange} />
                        {faviconFile && <p className="text-xs text-primary">{faviconFile.name} — ready to save</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Theme — tenant owner only */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Colors used on your public landing page and login page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <ColorField
                      label="Primary Color"
                      value={orgForm.primaryColor}
                      onChange={v => setOrgForm(prev => ({ ...prev, primaryColor: v }))}
                    />
                    <ColorField
                      label="Secondary Color"
                      value={orgForm.secondaryColor}
                      onChange={v => setOrgForm(prev => ({ ...prev, secondaryColor: v }))}
                    />
                    <ColorField
                      label="Background Color"
                      value={orgForm.backgroundColor}
                      onChange={v => setOrgForm(prev => ({ ...prev, backgroundColor: v }))}
                    />
                  </div>

                  <div
                    className="rounded-lg border p-5 flex items-center justify-between gap-4"
                    style={{ background: orgForm.backgroundColor || undefined }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: orgForm.backgroundColor ? '#fff' : undefined }}>
                        {orgForm.name || 'Your School'}
                      </p>
                      <p className="text-xs opacity-70" style={{ color: orgForm.backgroundColor ? '#fff' : undefined }}>
                        Live preview
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="rounded-md px-4 py-2 text-sm font-semibold"
                        style={{ background: orgForm.primaryColor || 'var(--primary)', color: '#fff' }}
                      >
                        Login
                      </span>
                      <span
                        className="rounded-md px-4 py-2 text-sm font-semibold"
                        style={{ background: orgForm.secondaryColor || 'var(--secondary)', color: '#fff' }}
                      >
                        Explore
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Official contact details for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Official Email
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={orgForm.email}
                      onChange={e => setOrgForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@school.edu"
                      className={fieldErrors.email ? 'border-destructive' : ''}
                    />
                    {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </Label>
                    <Input
                      id="contact-phone"
                      value={orgForm.phone}
                      onChange={e => setOrgForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className={fieldErrors.phone ? 'border-destructive' : ''}
                    />
                    {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">
                      <MessageCircle className="h-4 w-4 inline mr-2" />
                      WhatsApp Number
                    </Label>
                    <Input
                      id="whatsapp"
                      value={orgForm.whatsapp}
                      onChange={e => setOrgForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className={fieldErrors.whatsapp ? 'border-destructive' : ''}
                    />
                    {fieldErrors.whatsapp && <p className="text-xs text-destructive">{fieldErrors.whatsapp}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram">
                      <Send className="h-4 w-4 inline mr-2" />
                      Telegram
                    </Label>
                    <Input
                      id="telegram"
                      value={orgForm.telegram}
                      onChange={e => setOrgForm(prev => ({ ...prev, telegram: e.target.value }))}
                      placeholder="@yourschool"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">
                      <Globe className="h-4 w-4 inline mr-2" />
                      Website URL
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={orgForm.websiteUrl}
                      onChange={e => setOrgForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      placeholder="https://school.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fax">
                      <Printer className="h-4 w-4 inline mr-2" />
                      Fax Number
                    </Label>
                    <Input
                      id="fax"
                      value={orgForm.fax}
                      onChange={e => setOrgForm(prev => ({ ...prev, fax: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className={fieldErrors.fax ? 'border-destructive' : ''}
                    />
                    {fieldErrors.fax && <p className="text-xs text-destructive">{fieldErrors.fax}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
                <CardDescription>Your school's physical location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address-line1">Address Line 1</Label>
                  <Input
                    id="address-line1"
                    value={orgForm.addressLine1}
                    onChange={e => setOrgForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                    placeholder="123 Education Lane"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address-line2">Address Line 2 (optional)</Label>
                  <Input
                    id="address-line2"
                    value={orgForm.addressLine2}
                    onChange={e => setOrgForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                    placeholder="Suite 200"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={orgForm.city}
                      onChange={e => setOrgForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Springfield"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={orgForm.state}
                      onChange={e => setOrgForm(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="Illinois"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal">Postal Code</Label>
                    <Input
                      id="postal"
                      value={orgForm.postalCode}
                      onChange={e => setOrgForm(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="62701"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country Code</Label>
                    <Input
                      id="country"
                      value={orgForm.country}
                      onChange={e => setOrgForm(prev => ({ ...prev, country: e.target.value.toUpperCase() }))}
                      placeholder="PK"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maps-link">
                    <ExternalLink className="h-4 w-4 inline mr-2" />
                    Google Maps Link (optional)
                  </Label>
                  <Input
                    id="maps-link"
                    type="url"
                    value={orgForm.googleMapsUrl}
                    onChange={e => setOrgForm(prev => ({ ...prev, googleMapsUrl: e.target.value }))}
                    placeholder="https://maps.google.com/?q=..."
                  />
                </div>
              </CardContent>
            </Card>

            {orgError && (
              <Alert variant="destructive">
                <AlertDescription>{orgError}</AlertDescription>
              </Alert>
            )}

            {orgSaved && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>Organization details saved successfully.</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSaveOrganization} disabled={isSavingOrg}>
                {isSavingOrg && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </TabsContent>
        )}

        {/* System Settings Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Academic Settings</CardTitle>
                <CardDescription>Configure academic year and general settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="academic-year">Academic Year</Label>
                    <Select
                      value={settings?.academicYear}
                      onValueChange={value => setSettings(prev => ({ ...prev, academicYear: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings?.timezone}
                      onValueChange={value => setSettings(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Finance Settings</CardTitle>
                <CardDescription>Configure currency and expense approval settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Combobox
                      value={settings.currency}
                      onValueChange={value => {
                        const currency = currencyService.getCurrency(value)
                        setSettings(prev => ({
                          ...prev,
                          currency: value,
                          currencySymbol: currency?.symbol || value
                        }))
                      }}
                      options={CURRENCIES.map(curr => ({
                        value: curr.code,
                        label: `${curr.code} - ${curr.name} (${curr.symbol})`,
                        keywords: curr.region,
                      }))}
                      placeholder="Select currency"
                      searchPlaceholder="Search currencies…"
                      emptyText="No currencies found."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currencySymbol">Currency Symbol</Label>
                    <Input
                      id="currencySymbol"
                      value={settings.currencySymbol || currencyService.getCurrencySymbol(settings.currency)}
                      onChange={e => setSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                      placeholder="Enter symbol (e.g., $, €, ₨)"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Automatically set based on currency selection
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="threshold">Expense Approval Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={settings.expenseApprovalThreshold}
                    onChange={e => setSettings(prev => ({ 
                      ...prev, 
                      expenseApprovalThreshold: parseInt(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Expenses above this amount require approval
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Expense Approval Workflow</p>
                    <p className="text-sm text-muted-foreground">
                      Require approval for expenses above the threshold
                    </p>
                  </div>
                  <Switch
                    checked={settings.expenseApprovalEnabled}
                    onCheckedChange={checked => setSettings(prev => ({ 
                      ...prev, 
                      expenseApprovalEnabled: checked 
                    }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Access Control Tab */}
        {isOwner && (
          <TabsContent value="access-control" className="space-y-6">
            <AccessControlPanel />
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={checked => setNotifications(prev => ({ 
                    ...prev, 
                    emailNotifications: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Fee Reminders</p>
                  <p className="text-sm text-muted-foreground">Get reminders about pending fee payments</p>
                </div>
                <Switch
                  checked={notifications.feeReminders}
                  onCheckedChange={checked => setNotifications(prev => ({ 
                    ...prev, 
                    feeReminders: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Attendance Alerts</p>
                  <p className="text-sm text-muted-foreground">Notifications about attendance issues</p>
                </div>
                <Switch
                  checked={notifications.attendanceAlerts}
                  onCheckedChange={checked => setNotifications(prev => ({ 
                    ...prev, 
                    attendanceAlerts: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Task Assignments</p>
                  <p className="text-sm text-muted-foreground">Get notified when tasks are assigned to you</p>
                </div>
                <Switch
                  checked={notifications.taskAssignments}
                  onCheckedChange={checked => setNotifications(prev => ({ 
                    ...prev, 
                    taskAssignments: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">System Updates</p>
                  <p className="text-sm text-muted-foreground">Get notified about new features and updates</p>
                </div>
                <Switch
                  checked={notifications.systemUpdates}
                  onCheckedChange={checked => setNotifications(prev => ({ 
                    ...prev, 
                    systemUpdates: checked 
                  }))}
                />
              </div>

              <div className="flex justify-end">
                <Button disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  )
}
