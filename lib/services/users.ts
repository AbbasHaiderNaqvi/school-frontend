import { api, toPaginated } from './api-client'

export type ApiUserRole =
  | 'super_admin'
  | 'tenant_owner'
  | 'tenant_admin'
  | 'tenant_principal'
  | 'tenant_accountant'
  | 'tenant_cashier'
  | 'teacher'
  | 'hr'
  | 'student'
  | 'parent'

export interface UserListItem {
  id: string
  userCode: string
  fullName: string
  email: string
  role: ApiUserRole
  status: 'active' | 'inactive'
  isActive: boolean
  phone?: string
  createdAt: string
}

export interface CreateUserRequest {
  fullName: string
  email: string
  role: ApiUserRole
  phone?: string
  employeeId?: string
  studentId?: string
  parentId?: string
}

export interface CreateUserResponse {
  user: UserListItem
  setupUrl: string
}

export interface UpdateUserRequest {
  fullName?: string
  phone?: string
}

export interface UserDropdownItem {
  id: string
  fullName: string
  userCode: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ListUsersParams {
  page?: number
  limit?: number
  role?: ApiUserRole
  status?: 'active' | 'inactive'
  search?: string
}

export const usersService = {
  async list(params: ListUsersParams = {}): Promise<Paginated<UserListItem>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.role) query.set('role', params.role)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    const qs = query.toString()
    const { data } = await api.get<Paginated<UserListItem>>(`/users${qs ? `?${qs}` : ''}`)
    return toPaginated(data)
  },

  async getById(id: string): Promise<UserListItem | null> {
    const { data, error } = await api.get<UserListItem>(`/users/${id}`)
    if (error || !data) return null
    return data
  },

  async create(payload: CreateUserRequest): Promise<{ user: UserListItem | null; setupUrl?: string; error?: string }> {
    const { data, error } = await api.post<CreateUserResponse>('/users', payload)
    if (error || !data) return { user: null, error: error || 'Failed to create user' }
    return { user: data.user, setupUrl: data.setupUrl }
  },

  async update(id: string, payload: UpdateUserRequest): Promise<UserListItem | null> {
    const { data, error } = await api.patch<UserListItem>(`/users/${id}`, payload)
    if (error || !data) return null
    return data
  },

  async deactivate(id: string): Promise<boolean> {
    const { error } = await api.patch(`/users/${id}/deactivate`, {})
    return !error
  },

  async reactivate(id: string): Promise<boolean> {
    const { error } = await api.patch(`/users/${id}/reactivate`, {})
    return !error
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await api.delete(`/users/${id}`)
    return !error
  },

  async resetPassword(id: string): Promise<{ setupUrl?: string; error?: string }> {
    const { data, error } = await api.post<{ setupUrl: string }>(`/users/${id}/reset-password`, {})
    if (error || !data) return { error: error || 'Failed to reset password' }
    return { setupUrl: data.setupUrl }
  },

  async getDropdownStaff(): Promise<UserDropdownItem[]> {
    const { data } = await api.get<UserDropdownItem[]>('/users/dropdowns/staff')
    return data || []
  },

  async getDropdownTeachers(): Promise<UserDropdownItem[]> {
    const { data } = await api.get<UserDropdownItem[]>('/users/dropdowns/teachers')
    return data || []
  },

  async getDropdownStudents(): Promise<UserDropdownItem[]> {
    const { data } = await api.get<UserDropdownItem[]>('/users/dropdowns/students')
    return data || []
  },

  async getDropdownParents(): Promise<UserDropdownItem[]> {
    const { data } = await api.get<UserDropdownItem[]>('/users/dropdowns/parents')
    return data || []
  },
}
