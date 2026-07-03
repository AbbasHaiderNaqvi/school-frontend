'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { tenantService } from '@/lib/services/tenant'
import type { Tenant, TenantFeatures } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Building2,
  DollarSign,
  Users,
  Package,
  ClipboardList,
  UserCheck,
  Receipt,
  Check,
  X,
  Search,
  Save,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { TablePageSkeleton } from '@/components/ui/page-skeleton'

// Feature configuration with metadata
const FEATURE_CONFIG: Record<keyof TenantFeatures, {
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'core' | 'finance' | 'hr' | 'operations'
}> = {
  finance_module: {
    name: 'Finance & Accounting',
    description: 'General Ledger, budgeting, expense tracking, and financial reporting',
    icon: DollarSign,
    category: 'finance',
  },
  fee_module: {
    name: 'Fee Management',
    description: 'Student fees, invoicing, payments, and fee structures',
    icon: Receipt,
    category: 'finance',
  },
  hr_module: {
    name: 'HR & Payroll',
    description: 'Employee management, leave requests, recruitment, and payroll',
    icon: Users,
    category: 'hr',
  },
  attendance_module: {
    name: 'Attendance Tracking',
    description: 'Employee and student attendance, check-in/out, and reporting',
    icon: UserCheck,
    category: 'hr',
  },
  task_module: {
    name: 'Task Management',
    description: 'Kanban boards, task assignments, and project tracking',
    icon: ClipboardList,
    category: 'operations',
  },
  inventory_module: {
    name: 'Inventory & Assets',
    description: 'Asset tracking, inventory management, and procurement',
    icon: Package,
    category: 'operations',
  },
}

const CATEGORIES = [
  { id: 'all', name: 'All Features' },
  { id: 'finance', name: 'Finance' },
  { id: 'hr', name: 'HR & People' },
  { id: 'operations', name: 'Operations' },
]

export default function FeatureFlagsPage() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [bulkFeature, setBulkFeature] = useState<keyof TenantFeatures | ''>('')
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable'>('enable')
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([])

  // Check if user is super admin
  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    setLoading(true)
    const data = await tenantService.getAll()
    setTenants(data)
    setLoading(false)
  }

  const handleToggleFeature = async (tenantId: string, feature: keyof TenantFeatures, enabled: boolean) => {
    setSaving(tenantId)
    await tenantService.toggleFeature(tenantId, feature, enabled)
    await loadTenants()
    setSaving(null)
  }

  const handleBulkUpdate = async () => {
    if (!bulkFeature || selectedTenantIds.length === 0) return
    
    setSaving('bulk')
    for (const tenantId of selectedTenantIds) {
      await tenantService.toggleFeature(tenantId, bulkFeature, bulkAction === 'enable')
    }
    await loadTenants()
    setSelectedTenantIds([])
    setBulkFeature('')
    setSaving(null)
  }

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenantIds(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    )
  }

  const selectAllTenants = () => {
    const filteredIds = filteredTenants.map(t => t.id)
    const allSelected = filteredIds.every(id => selectedTenantIds.includes(id))
    if (allSelected) {
      setSelectedTenantIds([])
    } else {
      setSelectedTenantIds(filteredIds)
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' ||
                          (filterStatus === 'active' && tenant.isActive) ||
                          (filterStatus === 'inactive' && !tenant.isActive)
    return matchesSearch && matchesStatus
  })

  const getFeatureCount = (tenant: Tenant) => {
    return Object.values(tenant.features).filter(Boolean).length
  }

  const getTotalFeatures = () => {
    return Object.keys(FEATURE_CONFIG).length
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Only Super Admins can manage feature flags for tenants.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return <TablePageSkeleton />
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Feature Management"
        description="Control which features are available to each tenant"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{tenants.length}</p>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{tenants.filter(t => t.isActive).length}</p>
                <p className="text-sm text-muted-foreground">Active Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{getTotalFeatures()}</p>
                <p className="text-sm text-muted-foreground">Available Features</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ClipboardList className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{selectedTenantIds.length}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">By Tenant</TabsTrigger>
          <TabsTrigger value="features">By Feature</TabsTrigger>
        </TabsList>

        {/* By Tenant View */}
        <TabsContent value="tenants" className="space-y-4">
          {/* Filters and Bulk Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tenants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'inactive') => setFilterStatus(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Bulk Actions */}
                {selectedTenantIds.length > 0 && (
                  <>
                    <Select
                      value={bulkFeature}
                      onValueChange={(v) => setBulkFeature(v as keyof TenantFeatures)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select feature" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FEATURE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={bulkAction}
                      onValueChange={(v: 'enable' | 'disable') => setBulkAction(v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enable">Enable</SelectItem>
                        <SelectItem value="disable">Disable</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleBulkUpdate}
                      disabled={!bulkFeature || saving === 'bulk'}
                    >
                      {saving === 'bulk' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Apply to {selectedTenantIds.length}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenants Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={filteredTenants.length > 0 && filteredTenants.every(t => selectedTenantIds.includes(t.id))}
                        onChange={selectAllTenants}
                        className="rounded border-input"
                      />
                    </TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Features Enabled</TableHead>
                    {Object.entries(FEATURE_CONFIG).map(([key, config]) => (
                      <TableHead key={key} className="text-center w-24">
                        <div className="flex flex-col items-center gap-1">
                          <config.icon className="h-4 w-4" />
                          <span className="text-xs">{config.name.split(' ')[0]}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedTenantIds.includes(tenant.id)}
                          onChange={() => toggleTenantSelection(tenant.id)}
                          className="rounded border-input"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.subdomain}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                          {tenant.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(getFeatureCount(tenant) / getTotalFeatures()) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {getFeatureCount(tenant)}/{getTotalFeatures()}
                          </span>
                        </div>
                      </TableCell>
                      {Object.entries(FEATURE_CONFIG).map(([key]) => {
                        const featureKey = key as keyof TenantFeatures
                        const isEnabled = tenant.features[featureKey]
                        return (
                          <TableCell key={key} className="text-center">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleToggleFeature(tenant.id, featureKey, checked)}
                              disabled={saving === tenant.id}
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Feature View */}
        <TabsContent value="features" className="space-y-4">
          {CATEGORIES.filter(c => c.id !== 'all').map((category) => {
            const categoryFeatures = Object.entries(FEATURE_CONFIG).filter(
              ([, config]) => config.category === category.id
            )

            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>
                    {categoryFeatures.length} feature{categoryFeatures.length !== 1 ? 's' : ''} in this category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {categoryFeatures.map(([key, config]) => {
                    const featureKey = key as keyof TenantFeatures
                    const enabledCount = tenants.filter(t => t.features[featureKey]).length
                    const Icon = config.icon

                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{config.name}</h4>
                            <p className="text-sm text-muted-foreground">{config.description}</p>
                            <p className="text-sm text-primary mt-1">
                              Enabled for {enabledCount} of {tenants.length} tenants
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setSaving(key)
                                for (const tenant of tenants) {
                                  await tenantService.toggleFeature(tenant.id, featureKey, true)
                                }
                                await loadTenants()
                                setSaving(null)
                              }}
                              disabled={saving === key}
                            >
                              Enable All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setSaving(key)
                                for (const tenant of tenants) {
                                  await tenantService.toggleFeature(tenant.id, featureKey, false)
                                }
                                await loadTenants()
                                setSaving(null)
                              }}
                              disabled={saving === key}
                            >
                              Disable All
                            </Button>
                          </div>
                        </div>

                        {/* Per-tenant toggle list */}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {tenants.map((tenant) => (
                            <div
                              key={tenant.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${tenant.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                <span className="text-sm font-medium text-foreground">{tenant.name}</span>
                              </div>
                              <Switch
                                checked={tenant.features[featureKey]}
                                onCheckedChange={(checked) => handleToggleFeature(tenant.id, featureKey, checked)}
                                disabled={saving === tenant.id}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
