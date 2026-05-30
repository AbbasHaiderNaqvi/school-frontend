import { api } from './api-client'

export interface PermissionGroup {
  id: string
  name: string
  slug: string
  description?: string
  isSystem: boolean
  isProtected: boolean
  permissionCount: number
}

export interface ResolvedPermissions {
  flat: string[]
  byModule: Record<string, string[]>
}

export const accessControlService = {
  async getPermissionCatalog(): Promise<Record<string, unknown> | null> {
    const { data } = await api.get('/access-control/permissions')
    return (data as Record<string, unknown>) || null
  },

  async getGroups(): Promise<PermissionGroup[]> {
    const { data } = await api.get<PermissionGroup[]>('/access-control/groups')
    return data || []
  },

  async createGroup(payload: { name: string; description?: string }): Promise<{ group: PermissionGroup | null; error?: string }> {
    const { data, error } = await api.post<PermissionGroup>('/access-control/groups', payload)
    if (error || !data) return { group: null, error: error || 'Failed to create group' }
    return { group: data }
  },

  async cloneGroup(id: string, name: string): Promise<PermissionGroup | null> {
    const { data } = await api.post<PermissionGroup>(`/access-control/groups/${id}/clone`, { name })
    return data || null
  },

  async assignPermissionToGroup(groupId: string, permissionId: string, effect: 'ALLOW' | 'DENY'): Promise<boolean> {
    const { error } = await api.post(`/access-control/groups/${groupId}/permissions`, { permissionId, effect })
    return !error
  },

  async assignUserToGroup(userId: string, permissionGroupId: string): Promise<boolean> {
    const { error } = await api.post(`/access-control/users/${userId}/groups`, { permissionGroupId })
    return !error
  },

  async getResolvedPermissions(userId: string): Promise<ResolvedPermissions | null> {
    const { data } = await api.get<ResolvedPermissions>(`/access-control/users/${userId}/permissions/resolved`)
    return data || null
  },

  async assignDirectPermission(userId: string, permissionId: string, effect: 'ALLOW' | 'DENY'): Promise<boolean> {
    const { error } = await api.post(`/access-control/users/${userId}/permissions`, { permissionId, effect })
    return !error
  },
}
