import { api } from './api-client'

export interface MetadataDropdowns {
  roles: Array<{ value: string; label: string }>
  userStatuses: Array<{ value: string; label: string }>
  transactionTypes: Array<{ value: string; label: string }>
  paymentMethods: Array<{ value: string; label: string }>
  discountTypes: Array<{ value: string; label: string }>
  glAccountTypes: Array<{ value: string; label: string }>
}

export interface FeeDropdowns {
  classes: Array<{ id: string; name: string; sortOrder: number }>
  paymentMethods: Array<{ value: string; label: string }>
  invoiceStatuses: Array<{ value: string; label: string }>
  discountTypes: Array<{ value: string; label: string }>
  componentTypes: Array<{ value: string; label: string }>
  academicYears: string[]
}

export const metadataService = {
  async getDropdowns(): Promise<MetadataDropdowns | null> {
    const { data } = await api.get<MetadataDropdowns>('/metadata/drop-downs')
    return data || null
  },

  async getAssignableRoles(): Promise<Array<{ value: string; label: string }>> {
    const { data } = await api.get<Array<{ value: string; label: string }>>('/metadata/roles/assignable')
    return data || []
  },

  async getFinanceDropdowns(): Promise<unknown> {
    const { data } = await api.get('/metadata/finance/dropdowns')
    return data
  },

  async getFeeDropdowns(): Promise<FeeDropdowns | null> {
    const { data } = await api.get<FeeDropdowns>('/metadata/fees/dropdowns')
    return data || null
  },
}
