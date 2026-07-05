import { api, toPaginated } from './api-client'

export interface Permission {
  id: string
  key: string
  name: string
  description?: string | null
  module?: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ListPermissionsParams {
  page?: number
  limit?: number
  search?: string
}

export interface PermissionGroup {
  id: string
  name: string
  slug: string
  description?: string
  isSystem: boolean
  isProtected: boolean
  isDefault: boolean
  isActive: boolean
  createdAt: string
  permissionCount: number
}

export interface GroupPermission extends Permission {
  effect: 'ALLOW' | 'DENY'
}

export interface GroupDetail extends PermissionGroup {
  permissions: GroupPermission[]
}

// The catalog endpoint groups permissions under { modules: [{ module, permissions }], totalPermissions }.
// Stay defensive about older/alternate shapes too: bare array, { data: [...] }, or a plain
// { moduleName: [...] } map.
function normalizePermissions(raw: unknown): Permission[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as Permission[]
  const obj = raw as Record<string, unknown>
  if (Array.isArray(obj.modules)) {
    return (obj.modules as Array<{ module: string; permissions: Permission[] }>).flatMap(
      m => (m.permissions || []).map(p => ({ ...p, module: p.module || m.module }))
    )
  }
  if (Array.isArray(obj.data)) return obj.data as Permission[]
  return Object.entries(obj).flatMap(([module, items]) =>
    Array.isArray(items) ? (items as Permission[]).map(p => ({ module, ...p })) : []
  )
}

// Same defensive unwrap for a bare-array vs { data: [...] } list response.
function unwrapArray<T>(raw: unknown): T[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as T[]
  const obj = raw as Record<string, unknown>
  return Array.isArray(obj.data) ? (obj.data as T[]) : []
}

// Defensive unwrap for a group's assigned-permissions payload.
function normalizeGroupPermissions(raw: unknown): GroupPermission[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as GroupPermission[]
  const obj = raw as Record<string, unknown>
  if (Array.isArray(obj.permissions)) return obj.permissions as GroupPermission[]
  if (Array.isArray(obj.data)) return obj.data as GroupPermission[]
  return []
}

// The groups list wraps in { data: [...] } — mutation/detail endpoints may follow the
// same { data: {...} } envelope for single objects. Unwrap it if present, else pass through.
function unwrapObject<T>(raw: unknown): T | null {
  if (!raw) return null
  const obj = raw as Record<string, unknown>
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) return obj.data as T
  return raw as T
}

export const accessControlService = {
  async listPermissions(params: ListPermissionsParams = {}): Promise<Paginated<Permission>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.search) query.set('q', params.search)
    const qs = query.toString()
    const { data } = await api.get(`/access-control/permissions/list${qs ? `?${qs}` : ''}`)
    return toPaginated<Permission>(data)
  },

  async getPermissionCatalog(): Promise<Permission[]> {
    const { data } = await api.get('/access-control/permissions')
    return normalizePermissions(data)
  },

  async getDropdowns(): Promise<Record<string, unknown> | null> {
    const { data } = await api.get('/access-control/dropdowns')
    return (data as Record<string, unknown>) || null
  },

  async getGroups(): Promise<PermissionGroup[]> {
    const { data } = await api.get('/access-control/groups')
    return unwrapArray<PermissionGroup>(data)
  },

  async getGroup(id: string): Promise<GroupDetail | null> {
    const { data } = await api.get(`/access-control/groups/${id}`)
    const obj = unwrapObject<Record<string, unknown>>(data)
    if (!obj) return null
    return { ...(obj as unknown as PermissionGroup), permissions: normalizeGroupPermissions(obj) }
  },

  async createGroup(payload: { name: string; description?: string }): Promise<{ group: PermissionGroup | null; error?: string }> {
    const { data, error } = await api.post('/access-control/groups', payload)
    const group = unwrapObject<PermissionGroup>(data)
    if (error || !group) return { group: null, error: error || 'Failed to create group' }
    return { group }
  },

  async updateGroup(id: string, payload: { name?: string; description?: string }): Promise<{ group: PermissionGroup | null; error?: string }> {
    const { data, error } = await api.patch(`/access-control/groups/${id}`, payload)
    const group = unwrapObject<PermissionGroup>(data)
    if (error || !group) return { group: null, error: error || 'Failed to update group' }
    return { group }
  },

  async deleteGroup(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.delete(`/access-control/groups/${id}`)
    return { success: !error, error: error || undefined }
  },

  async cloneGroup(id: string, name: string): Promise<{ group: PermissionGroup | null; error?: string }> {
    const { data, error } = await api.post(`/access-control/groups/${id}/clone`, { name })
    const group = unwrapObject<PermissionGroup>(data)
    if (error || !group) return { group: null, error: error || 'Failed to clone group' }
    return { group }
  },

  async addPermissionToGroup(groupId: string, permissionId: string, effect: 'ALLOW' | 'DENY' = 'ALLOW'): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.post(`/access-control/groups/${groupId}/permissions`, { permissionId, effect })
    return { success: !error, error: error || undefined }
  },

  async removePermissionFromGroup(groupId: string, permissionId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.delete(`/access-control/groups/${groupId}/permissions/${permissionId}`)
    return { success: !error, error: error || undefined }
  },
}
