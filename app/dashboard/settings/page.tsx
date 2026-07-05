'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { tenantService, authService } from '@/lib/services'
import { brandingService, type TenantBranding } from '@/lib/services/branding'
import { AccessControlPanel } from '@/components/settings/access-control-panel'
import { currencyService, CURRENCIES } from '@/lib/utils/currency'
import type { Tenant, TenantContactInfo } from '@/lib/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { getInitials } from '@/lib/utils'
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
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

export default function SettingsPage() {
  const { user, tenant, refreshTenant } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [isSavingBranding, setIsSavingBranding] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Branding state
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [brandingDescription, setBrandingDescription] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [brandingSaved, setBrandingSaved] = useState(false)
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: '',
  })

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Tenant details state (for tenant admin)
  const [tenantData, setTenantData] = useState<Partial<Tenant>>({
    name: '',
    logo: '',
    subdomain: '',
  })

  // Contact info state
  const [contactInfo, setContactInfo] = useState<TenantContactInfo>({
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    googleMapsLink: '',
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
        avatar: user.avatar || '',
      })
    }
    if (tenant) {
      setTenantData({
        name: tenant.name,
        logo: tenant.logo || '',
        subdomain: tenant.subdomain,
      })
      setContactInfo(tenant.contactInfo || {
        email: '',
        phone: '',
        whatsapp: '',
        website: '',
        address: { street: '', city: '', state: '', country: '', postalCode: '' },
        googleMapsLink: '',
      })
    }
  }, [user, tenant])

  // Load branding on mount (tenant owner only)
  useEffect(() => {
    if (user?.role !== 'tenant_owner') return
    brandingService.getBranding().then(data => {
      if (data) {
        setBranding(data)
        setBrandingDescription(data.description || '')
        if (data.logoUrl) setLogoPreview(data.logoUrl)
        if (data.faviconUrl) setFaviconPreview(data.faviconUrl)
      }
    })
  }, [user?.role])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setBrandingError('Logo must be under 2 MB.')
      e.target.value = ''
      return
    }
    setBrandingError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 256 * 1024) {
      setBrandingError('Favicon must be under 256 KB.')
      e.target.value = ''
      return
    }
    setBrandingError(null)
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

  const handleSaveBranding = async () => {
    setIsSavingBranding(true)
    setBrandingSaved(false)
    setBrandingError(null)
    const result = await brandingService.updateBranding({
      description: brandingDescription,
      logo: logoFile,
      favicon: faviconFile,
    })
    if (result.success) {
      setLogoFile(null)
      setFaviconFile(null)
      if (result.data?.logoUrl) setLogoPreview(result.data.logoUrl)
      if (result.data?.faviconUrl) setFaviconPreview(result.data.faviconUrl)
      setBrandingSaved(true)
      setTimeout(() => setBrandingSaved(false), 3000)
    } else {
      setBrandingError(result.error || 'Failed to save branding.')
    }
    setIsSavingBranding(false)
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    await authService.updateUser({
      name: profileData.name,
      avatar: profileData.avatar,
    })
    setIsSaving(false)
  }

  const handleSavePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    setIsSaving(true)
    // In a real app, this would validate the current password and update
    await new Promise(resolve => setTimeout(resolve, 500))
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setIsSaving(false)
    alert('Password updated successfully')
  }

  const handleSaveOrgDetails = async () => {
    if (!tenant) return
    setIsSavingDetails(true)
    await tenantService.update(tenant.id, {
      name: tenantData.name,
      logo: tenantData.logo,
      subdomain: tenantData.subdomain,
    })
    refreshTenant?.()
    setIsSavingDetails(false)
  }

  const handleSaveContactInfo = async () => {
    if (!tenant) return
    setIsSavingContact(true)
    await tenantService.updateContactInfo(tenant.id, contactInfo)
    refreshTenant?.()
    setIsSavingContact(false)
  }

  const handleSaveSettings = async () => {
    if (!tenant) return
    setIsSaving(true)
    await tenantService.updateSettings(tenant.id, settings)
    refreshTenant?.()
    setIsSaving(false)
  }

  const isAdmin = ['super_admin', 'tenant_owner', 'tenant_admin', 'tenant_principal'].includes(user?.role || '')
  const isOwner = user?.role === 'tenant_owner'

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
              <CardDescription>Update your personal information and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(profileData.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">{profileData.name}</h3>
                  <Badge variant="secondary" className="capitalize">
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    {profileData.avatar && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setProfileData(prev => ({ ...prev, avatar: '' }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
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

            {/* Organization Details */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Update your school name and subdomain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={tenantData.name}
                      onChange={e => setTenantData(prev => ({ ...prev, name: e.target.value }))}
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
                <div className="flex justify-end">
                  <Button onClick={handleSaveOrgDetails} disabled={isSavingDetails}>
                    {isSavingDetails && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Branding — tenant owner only */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>Logo, favicon, and description shown on your public page</CardDescription>
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

                  <Separator />

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="org-branding-desc" className="text-sm font-medium">School Description</Label>
                    <Textarea
                      id="org-branding-desc"
                      placeholder="A brief tagline shown on your public landing page…"
                      value={brandingDescription}
                      onChange={e => setBrandingDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {brandingError && (
                    <Alert variant="destructive">
                      <AlertDescription>{brandingError}</AlertDescription>
                    </Alert>
                  )}

                  {brandingSaved && (
                    <Alert className="border-green-200 bg-green-50 text-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription>Branding saved successfully.</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSaveBranding} disabled={isSavingBranding}>
                      {isSavingBranding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      Save Branding
                    </Button>
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
                      value={contactInfo.email}
                      onChange={e => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@school.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </Label>
                    <Input
                      id="contact-phone"
                      value={contactInfo.phone}
                      onChange={e => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">
                      <Phone className="h-4 w-4 inline mr-2" />
                      WhatsApp Number
                    </Label>
                    <Input
                      id="whatsapp"
                      value={contactInfo.whatsapp}
                      onChange={e => setContactInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
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
                      value={contactInfo.website}
                      onChange={e => setContactInfo(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://school.edu"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={contactInfo.address.street}
                      onChange={e => setContactInfo(prev => ({
                        ...prev,
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      placeholder="123 Education Lane"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={contactInfo.address.city}
                        onChange={e => setContactInfo(prev => ({
                          ...prev,
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        placeholder="Springfield"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={contactInfo.address.state}
                        onChange={e => setContactInfo(prev => ({
                          ...prev,
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        placeholder="Illinois"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={contactInfo.address.country}
                        onChange={e => setContactInfo(prev => ({
                          ...prev,
                          address: { ...prev.address, country: e.target.value }
                        }))}
                        placeholder="United States"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal">Postal Code</Label>
                      <Input
                        id="postal"
                        value={contactInfo.address.postalCode}
                        onChange={e => setContactInfo(prev => ({
                          ...prev,
                          address: { ...prev.address, postalCode: e.target.value }
                        }))}
                        placeholder="62701"
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
                      value={contactInfo.googleMapsLink}
                      onChange={e => setContactInfo(prev => ({ ...prev, googleMapsLink: e.target.value }))}
                      placeholder="https://maps.google.com/?q=..."
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveContactInfo} disabled={isSavingContact}>
                    {isSavingContact && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Contact Info
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                        <SelectItem value="2024-2025">2024-2025</SelectItem>
                        <SelectItem value="2025-2026">2025-2026</SelectItem>
                        <SelectItem value="2026-2027">2026-2027</SelectItem>
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
                    <Select
                      value={settings.currency}
                      onValueChange={value => {
                        const currency = currencyService.getCurrency(value)
                        setSettings(prev => ({ 
                          ...prev, 
                          currency: value,
                          currencySymbol: currency?.symbol || value
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {CURRENCIES.map(curr => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.code} - {curr.name} ({curr.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
