'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tenantService } from '@/lib/services'
import type { Tenant, TenantFeatures } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  Building2,
  Plus,
  MoreHorizontal,
  Search,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isFeatureOpen, setIsFeatureOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [newTenant, setNewTenant] = useState({ name: '', subdomain: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    const data = await tenantService.getAll()
    setTenants(data)
    setIsLoading(false)
  }

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.subdomain) return
    setIsSubmitting(true)
    
    await tenantService.create({
      name: newTenant.name,
      subdomain: newTenant.subdomain,
      isActive: true,
      features: {
        finance_module: true,
        hr_module: true,
        inventory_module: true,
        task_module: true,
        attendance_module: true,
        fee_module: true,
      },
      settings: {
        academicYear: '2025-2026',
        currency: 'USD',
        timezone: 'UTC',
        expenseApprovalThreshold: 1000,
        expenseApprovalEnabled: true,
      },
    })

    setNewTenant({ name: '', subdomain: '' })
    setIsCreateOpen(false)
    setIsSubmitting(false)
    loadTenants()
  }

  const handleToggleStatus = async (tenant: Tenant) => {
    if (tenant.isActive) {
      await tenantService.suspend(tenant.id)
    } else {
      await tenantService.activate(tenant.id)
    }
    loadTenants()
  }

  const handleToggleFeature = async (feature: keyof TenantFeatures) => {
    if (!selectedTenant) return
    
    const newValue = !selectedTenant.features[feature]
    await tenantService.toggleFeature(selectedTenant.id, feature, newValue)
    
    setSelectedTenant({
      ...selectedTenant,
      features: { ...selectedTenant.features, [feature]: newValue },
    })
    loadTenants()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      await tenantService.delete(id)
      loadTenants()
    }
  }

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const featureLabels: Record<keyof TenantFeatures, string> = {
    finance_module: 'Finance Module',
    hr_module: 'HR Module',
    inventory_module: 'Inventory Module',
    task_module: 'Task Module',
    attendance_module: 'Attendance Module',
    fee_module: 'Fee Management',
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tenant Management" description="Manage schools and organizations" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tenant Management" description="Manage schools and organizations">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Add a new school or organization to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">School Name</Label>
                <Input
                  id="name"
                  placeholder="Enter school name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    placeholder="school-name"
                    value={newTenant.subdomain}
                    onChange={(e) =>
                      setNewTenant({
                        ...newTenant,
                        subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                    className="rounded-r-none"
                  />
                <span className="px-3 py-2 bg-muted border border-l-0 border-input rounded-r-md text-sm text-muted-foreground">
                  .mudir.com
                </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTenant} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Tenant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tenants Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                  <CardDescription>{tenant.subdomain}.mudir.com</CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedTenant(tenant)
                      setIsFeatureOpen(true)
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Features
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleStatus(tenant)}>
                    {tenant.isActive ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Suspend
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(tenant.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{formatDate(tenant.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Academic Year</span>
                  <span className="text-sm">{tenant.settings.academicYear}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Enabled Modules</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(tenant.features)
                      .filter(([_, enabled]) => enabled)
                      .map(([feature]) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {featureLabels[feature as keyof TenantFeatures].replace(' Module', '')}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No tenants found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first tenant'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature Management Dialog */}
      <Dialog open={isFeatureOpen} onOpenChange={setIsFeatureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Features</DialogTitle>
            <DialogDescription>
              Enable or disable modules for {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTenant &&
              Object.entries(selectedTenant.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between">
                  <Label htmlFor={feature} className="flex-1">
                    {featureLabels[feature as keyof TenantFeatures]}
                  </Label>
                  <Switch
                    id={feature}
                    checked={enabled}
                    onCheckedChange={() => handleToggleFeature(feature as keyof TenantFeatures)}
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFeatureOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
