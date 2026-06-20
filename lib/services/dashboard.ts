import { api } from './api-client'

export interface MenuItem {
  key: string
  label: string
  icon?: string
  route?: string
  children?: MenuItem[]
}

export interface BootstrapResponse {
  user: {
    id: string
    email: string
    fullName: string
    role: string
    status: 'active' | 'inactive'
    tenantId: string
    tenantSlug: string
  }
  tenant: {
    id: string
    name: string
    slug: string
    logoUrl?: string
    features: Record<string, boolean>
  }
  permissions: {
    flat: string[]
    byModule: Record<string, string[]>
  }
  menu: MenuItem[]
}

export interface DashboardSummary {
  users: {
    total: number
    active: number
    invited: number
    inactive: number
  }
  finance: {
    income: string
    expenses: string
    netIncome: string
  }
  features: {
    enabledCount: number
    disabledCount: number
  }
}

export const dashboardService = {
  async bootstrap(): Promise<BootstrapResponse | null> {
    const { data, error } = await api.get<BootstrapResponse>('/dashboard/bootstrap')
    if (error) {
      console.error('[api] Failed to fetch bootstrap:', error)
      return null
    }
    return data
  },

  async getSummary(): Promise<DashboardSummary | null> {
    const { data, error } = await api.get<DashboardSummary>('/dashboard/summary')
    if (error) {
      console.error('[api] Failed to fetch dashboard summary:', error)
      return null
    }
    return data
  },
}
