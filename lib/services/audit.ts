import { api, toPaginated } from './api-client'

export interface AuditLog {
  id: string
  tenantId?: string
  actorUserId: string
  module?: string
  action: string
  entityId?: string
  entityType?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ListAuditParams {
  page?: number
  limit?: number
  module?: string
  action?: string
  actorUserId?: string
  from?: string
  to?: string
}

export const auditService = {
  async getPlatformLogs(params: ListAuditParams = {}): Promise<Paginated<AuditLog>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.module) q.set('module', params.module)
    if (params.action) q.set('action', params.action)
    if (params.actorUserId) q.set('actorUserId', params.actorUserId)
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    const qs = q.toString()
    const { data } = await api.get<Paginated<AuditLog>>(`/audit-logs${qs ? `?${qs}` : ''}`)
    return toPaginated(data)
  },

  async getFinanceLogs(params: ListAuditParams = {}): Promise<Paginated<AuditLog>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    const qs = q.toString()
    const { data } = await api.get<Paginated<AuditLog>>(`/audit-logs/finance${qs ? `?${qs}` : ''}`)
    return toPaginated(data)
  },
}
