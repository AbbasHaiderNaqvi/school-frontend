import { storage, STORAGE_KEYS } from './storage'
import type { Tenant, TenantFeatures, TenantSettings, TenantContactInfo } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

const DEFAULT_FEATURES: TenantFeatures = {
  finance_module: true,
  hr_module: true,
  inventory_module: true,
  task_module: true,
  attendance_module: true,
  fee_module: true,
}

const DEFAULT_SETTINGS: TenantSettings = {
  academicYear: '2025-2026',
  currency: 'USD',
  currencySymbol: '$',
  timezone: 'UTC',
  expenseApprovalThreshold: 1000,
  expenseApprovalEnabled: true,
  incomeHeads: ['Tuition Fees', 'Admission Fees', 'Transport Fees', 'Exam Fees', 'Library Fees', 'Sports Fees', 'Other Income'],
  expenseHeads: ['Salaries', 'Utilities', 'Rent', 'Maintenance', 'Supplies', 'Marketing', 'Transportation', 'Other Expenses'],
  assetCategories: ['Buildings', 'Furniture', 'Equipment', 'Computers', 'Vehicles', 'Library Books', 'Sports Equipment'],
  liabilityCategories: ['Loans', 'Pending Salaries', 'Vendor Payments', 'Other Liabilities'],
}

const DEFAULT_CONTACT_INFO: TenantContactInfo = {
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
}

// Initialize with demo tenants
const initializeTenants = (): Tenant[] => {
  const existing = storage.get<Tenant[]>(STORAGE_KEYS.TENANTS)
  if (existing && existing.length > 0) return existing

  const demoTenants: Tenant[] = [
    {
      id: 'tenant_1',
      name: 'MD Grammar School',
      subdomain: 'md-grammar',
      isActive: true,
      features: DEFAULT_FEATURES,
      settings: DEFAULT_SETTINGS,
      contactInfo: {
        email: 'info@mdgrammar.edu',
        phone: '+1 (555) 123-4567',
        whatsapp: '+1 (555) 123-4567',
        website: 'https://mdgrammar.edu',
        address: {
          street: '123 Education Lane',
          city: 'Springfield',
          state: 'Illinois',
          country: 'United States',
          postalCode: '62701',
        },
        googleMapsLink: 'https://maps.google.com/?q=Springfield+IL',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tenant_2',
      name: 'Springfield Academy',
      subdomain: 'springfield',
      isActive: true,
      features: { ...DEFAULT_FEATURES, inventory_module: false },
      settings: DEFAULT_SETTINGS,
      contactInfo: {
        ...DEFAULT_CONTACT_INFO,
        email: 'contact@springfield.edu',
        phone: '+1 (555) 234-5678',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tenant_3',
      name: 'Riverside High School',
      subdomain: 'riverside',
      isActive: false,
      features: DEFAULT_FEATURES,
      settings: DEFAULT_SETTINGS,
      contactInfo: DEFAULT_CONTACT_INFO,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  storage.set(STORAGE_KEYS.TENANTS, demoTenants)
  return demoTenants
}

export const tenantService = {
  async getAll(): Promise<Tenant[]> {
    await new Promise(resolve => setTimeout(resolve, 100))
    return initializeTenants()
  },

  async getById(id: string): Promise<Tenant | null> {
    const tenants = await this.getAll()
    return tenants.find(t => t.id === id) || null
  },

  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const tenants = await this.getAll()
    
    const newTenant: Tenant = {
      ...data,
      id: generateId(),
      features: data.features || DEFAULT_FEATURES,
      settings: data.settings || DEFAULT_SETTINGS,
      contactInfo: data.contactInfo || DEFAULT_CONTACT_INFO,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    tenants.push(newTenant)
    storage.set(STORAGE_KEYS.TENANTS, tenants)

    auditService.log({
      action: 'CREATE',
      entity: 'Tenant',
      entityId: newTenant.id,
      details: `Created tenant: ${newTenant.name}`,
    })

    return newTenant
  },

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    const tenants = await this.getAll()
    const index = tenants.findIndex(t => t.id === id)
    
    if (index === -1) return null

    tenants[index] = {
      ...tenants[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }

    storage.set(STORAGE_KEYS.TENANTS, tenants)

    auditService.log({
      action: 'UPDATE',
      entity: 'Tenant',
      entityId: id,
      details: `Updated tenant: ${tenants[index].name}`,
    })

    return tenants[index]
  },

  async toggleFeature(tenantId: string, feature: keyof TenantFeatures, enabled: boolean): Promise<Tenant | null> {
    const tenant = await this.getById(tenantId)
    if (!tenant) return null

    return this.update(tenantId, {
      features: { ...tenant.features, [feature]: enabled },
    })
  },

  async updateSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<Tenant | null> {
    const tenant = await this.getById(tenantId)
    if (!tenant) return null

    return this.update(tenantId, {
      settings: { ...tenant.settings, ...settings },
    })
  },

  async updateContactInfo(tenantId: string, contactInfo: Partial<TenantContactInfo>): Promise<Tenant | null> {
    const tenant = await this.getById(tenantId)
    if (!tenant) return null

    return this.update(tenantId, {
      contactInfo: { 
        ...tenant.contactInfo, 
        ...contactInfo,
        address: { 
          ...tenant.contactInfo.address, 
          ...(contactInfo.address || {}) 
        }
      },
    })
  },

  async suspend(id: string): Promise<Tenant | null> {
    return this.update(id, { isActive: false })
  },

  async activate(id: string): Promise<Tenant | null> {
    return this.update(id, { isActive: true })
  },

  async delete(id: string): Promise<boolean> {
    const tenants = await this.getAll()
    const filtered = tenants.filter(t => t.id !== id)
    
    if (filtered.length === tenants.length) return false

    storage.set(STORAGE_KEYS.TENANTS, filtered)

    auditService.log({
      action: 'DELETE',
      entity: 'Tenant',
      entityId: id,
      details: `Deleted tenant with ID: ${id}`,
    })

    return true
  },

  async getStats(): Promise<{ total: number; active: number; inactive: number }> {
    const tenants = await this.getAll()
    return {
      total: tenants.length,
      active: tenants.filter(t => t.isActive).length,
      inactive: tenants.filter(t => !t.isActive).length,
    }
  },
}
