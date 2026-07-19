import { api, toPaginated } from './api-client'

function toArray<T>(raw: unknown): T[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as T[]
  const p = raw as Record<string, unknown>
  if (Array.isArray(p.data)) return p.data as T[]
  return []
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export type BudgetEnforcement = 'OFF' | 'ON_PURCHASE' | 'ON_ISSUE' | 'BOTH'
export type StockCondition = 'NEW' | 'USED' | 'DAMAGED' | 'BROKEN' | 'EXPIRED'
export type GrnType = 'VENDOR' | 'OPENING' | 'DONATION'
export type IssueTargetType = 'DEPARTMENT' | 'CLASS' | 'EMPLOYEE' | 'OTHER'
export type AdjustmentDecision = 'APPROVED' | 'REJECTED'

export interface InventorySettings {
  glIntegrationEnabled: boolean
  budgetEnforcement: BudgetEnforcement
  assetAccountId?: string | null
  consumptionAccountId?: string | null
  [key: string]: unknown
}

export interface UpdateInventorySettingsRequest {
  glIntegrationEnabled: boolean
  budgetEnforcement: BudgetEnforcement
  assetAccountId?: string
  consumptionAccountId?: string
}

export interface InventoryCategory {
  id: string
  name: string
  description?: string | null
  parentId?: string | null
  parent?: { id: string; name: string } | null
  createdAt?: string
  [key: string]: unknown
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  parentId?: string
}

export interface InventoryUnit {
  id: string
  name: string
  symbol: string
  allowFractions: boolean
  [key: string]: unknown
}

export interface CreateUnitRequest {
  name: string
  symbol: string
  allowFractions: boolean
}

export interface InventoryLocation {
  id: string
  name: string
  kind?: string | null
  parentId?: string | null
  path?: string
  isActive?: boolean
  children?: InventoryLocation[]
  [key: string]: unknown
}

export interface CreateLocationRequest {
  name: string
  kind?: string
  parentId?: string
}

export interface DropdownItem {
  id: string
  name: string
  [key: string]: unknown
}

export interface UnitDropdownItem extends DropdownItem {
  symbol: string
  allowFractions: boolean
}

export interface LocationDropdownItem extends DropdownItem {
  path: string
  kind?: string | null
}

export interface ItemDropdownItem extends DropdownItem {
  code: string
  unitSymbol?: string
  trackExpiry: boolean
}

export interface InventoryItemRecord {
  id: string
  code: string
  name: string
  categoryId?: string | null
  category?: { id: string; name: string } | null
  unitId?: string | null
  unit?: { id: string; name: string; symbol: string; allowFractions: boolean } | null
  trackExpiry: boolean
  minStockLevel?: number | null
  reorderLevel?: number | null
  barcode?: string | null
  assetTag?: string | null
  description?: string | null
  locationPath?: string
  [key: string]: unknown
}

// NOTE: POST /inventory/items rejects minStockLevel/reorderLevel with
// VALIDATION_ERROR ("property should not exist") — confirmed from a real
// response, so they are deliberately absent here.
export interface CreateItemRequest {
  name: string
  categoryId: string
  unitId: string
  trackExpiry: boolean
  barcode?: string
  assetTag?: string
  description?: string
}

export interface GrnLine {
  itemId: string
  quantity: number
  unitCost: string
  locationId: string
  condition: StockCondition
  expiryDate?: string
}

export interface CreateGrnRequest {
  type: GrnType
  vendorId?: string
  date: string
  lines: GrnLine[]
}

// Confirmed shape of GET /inventory/grns: grnNo, sourceType, vendorName,
// receivedDate, totalValue, journalEntryId (flat, camelCase). Lines only
// appear on the detail endpoint.
export interface Grn {
  id: string
  grnNo: string
  sourceType: GrnType
  vendorId?: string | null
  vendorName?: string | null
  vendorBillId?: string | null
  receivedDate: string
  totalValue?: string
  journalEntryId?: string | null
  lines?: Array<GrnLine & { id?: string; itemName?: string; locationPath?: string }>
  createdAt?: string
  [key: string]: unknown
}

function normalizeGrn(raw: Record<string, unknown>): Grn {
  return {
    ...raw,
    id: raw.id as string,
    grnNo: (raw.grnNo ?? raw.grn_no ?? raw.number) as string,
    sourceType: (raw.sourceType ?? raw.source_type ?? raw.type) as GrnType,
    vendorId: (raw.vendorId ?? raw.vendor_id) as string | null | undefined,
    vendorName: (raw.vendorName ?? raw.vendor_name ?? (raw.vendor as { name?: string } | null)?.name) as string | null | undefined,
    vendorBillId: (raw.vendorBillId ?? raw.vendor_bill_id) as string | null | undefined,
    receivedDate: (raw.receivedDate ?? raw.received_date ?? raw.date) as string,
    totalValue: (raw.totalValue ?? raw.total_value) as string | undefined,
    journalEntryId: (raw.journalEntryId ?? raw.journal_entry_id) as string | null | undefined,
    lines: Array.isArray(raw.lines)
      ? (raw.lines as Record<string, unknown>[]).map(l => ({ ...l, quantity: (l.quantity ?? l.qty) as number })) as Grn['lines']
      : undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
  }
}

export interface IssueLine {
  itemId: string
  quantity: number
  locationId: string
  condition: StockCondition
}

export interface CreateIssueRequest {
  targetType: IssueTargetType
  targetId?: string
  targetName?: string
  purpose: string
  date: string
  lines: IssueLine[]
}

export interface ReturnIssueRequest {
  lines: Array<{ issueLineId: string; quantity: number }>
}

// Confirmed shape of GET /inventory/issues: issueNo, targetKind, targetName,
// purpose, issueDate, totalValue, journalEntryId (flat, camelCase). Lines only
// appear on the detail endpoint.
export interface Issue {
  id: string
  issueNo: string
  targetKind: IssueTargetType
  targetId?: string | null
  targetName?: string | null
  purpose: string
  issueDate: string
  totalValue?: string
  journalEntryId?: string | null
  lines?: Array<IssueLine & { id?: string; itemName?: string; locationPath?: string; returnedQty?: number }>
  createdAt?: string
  [key: string]: unknown
}

function normalizeIssue(raw: Record<string, unknown>): Issue {
  return {
    ...raw,
    id: raw.id as string,
    issueNo: (raw.issueNo ?? raw.issue_no ?? raw.number) as string,
    targetKind: (raw.targetKind ?? raw.target_kind ?? raw.targetType ?? raw.target_type) as IssueTargetType,
    targetId: (raw.targetId ?? raw.target_id) as string | null | undefined,
    targetName: (raw.targetName ?? raw.target_name) as string | null | undefined,
    purpose: raw.purpose as string,
    issueDate: (raw.issueDate ?? raw.issue_date ?? raw.date) as string,
    totalValue: (raw.totalValue ?? raw.total_value) as string | undefined,
    journalEntryId: (raw.journalEntryId ?? raw.journal_entry_id) as string | null | undefined,
    lines: Array.isArray(raw.lines)
      ? (raw.lines as Record<string, unknown>[]).map(l => ({ ...l, quantity: (l.quantity ?? l.qty) as number, returnedQty: (l.returnedQty ?? l.returned_qty) as number | undefined })) as Issue['lines']
      : undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
  }
}

export interface CreateTransferRequest {
  fromLocationId: string
  toLocationId: string
  date: string
  lines: Array<{ itemId: string; quantity: number; condition: StockCondition; expiryDate?: string }>
}

export interface Transfer {
  id: string
  number: string
  fromLocationId: string
  toLocationId: string
  date: string
  lines: unknown[]
  [key: string]: unknown
}

export interface CreateConditionChangeRequest {
  itemId: string
  locationId: string
  fromCondition: StockCondition
  toCondition: StockCondition
  quantity: number
  reason: string
}

export interface ConditionChange {
  id: string
  itemId: string
  itemName?: string
  locationId: string
  locationPath?: string
  fromCondition: StockCondition
  toCondition: StockCondition
  quantity: number
  reason: string
  createdAt?: string
  [key: string]: unknown
}

export interface CreateAdjustmentRequest {
  itemId: string
  locationId: string
  condition: StockCondition
  quantityDelta: number
  reasonCode: string
  reason: string
}

export interface Adjustment {
  id: string
  itemId: string
  itemName?: string
  locationId: string
  locationPath?: string
  condition: StockCondition
  quantityDelta: number
  reasonCode: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdBy?: string
  createdByName?: string
  decidedBy?: string
  decisionReason?: string
  createdAt?: string
  [key: string]: unknown
}

export interface StockBucket {
  itemId: string
  itemName: string
  itemCode?: string
  locationId: string
  locationPath: string
  condition: StockCondition
  expiryDate?: string | null
  quantity: number
  unitSymbol?: string
  totalValue?: string
  [key: string]: unknown
}

export interface StockByItem {
  itemId: string
  itemName: string
  buckets: StockBucket[]
  totalsByCondition: Record<string, number>
  overallTotal: number
  [key: string]: unknown
}

export interface StockMovement {
  id: string
  itemId: string
  itemName?: string
  type: string
  quantity: number
  documentType?: string
  documentNumber?: string
  date: string
  [key: string]: unknown
}

interface ListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

function buildQuery(params: object = {}): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const inventoryService = {
  // Settings
  async getSettings(): Promise<InventorySettings | null> {
    const { data } = await api.get<InventorySettings>('/inventory/settings')
    return data
  },

  async updateSettings(payload: UpdateInventorySettingsRequest): Promise<{ data: InventorySettings | null; error?: string }> {
    const { data, error } = await api.put<InventorySettings>('/inventory/settings', payload)
    if (error || !data) return { data: null, error: error || 'Failed to update settings' }
    return { data }
  },

  // Categories
  async getCategories(params: ListParams & { parentId?: string } = {}): Promise<Paginated<InventoryCategory>> {
    const { data } = await api.get(`/inventory/categories${buildQuery(params)}`)
    return toPaginated<InventoryCategory>(data)
  },

  async getCategory(id: string): Promise<InventoryCategory | null> {
    const { data } = await api.get<InventoryCategory>(`/inventory/categories/${id}`)
    return data
  },

  async createCategory(payload: CreateCategoryRequest): Promise<{ data: InventoryCategory | null; error?: string }> {
    const { data, error } = await api.post<InventoryCategory>('/inventory/categories', payload)
    if (error || !data) return { data: null, error: error || 'Failed to create category' }
    return { data }
  },

  async updateCategory(id: string, payload: Partial<CreateCategoryRequest>): Promise<{ data: InventoryCategory | null; error?: string }> {
    const { data, error } = await api.patch<InventoryCategory>(`/inventory/categories/${id}`, payload)
    if (error || !data) return { data: null, error: error || 'Failed to update category' }
    return { data }
  },

  async deleteCategory(id: string): Promise<{ error?: string }> {
    const { error } = await api.delete(`/inventory/categories/${id}`)
    return { error: error || undefined }
  },

  async getCategoriesDropdown(): Promise<DropdownItem[]> {
    const { data } = await api.get<DropdownItem[]>('/inventory/categories/dropdown')
    return toArray<DropdownItem>(data)
  },

  // Units
  async getUnits(params: ListParams = {}): Promise<Paginated<InventoryUnit>> {
    const { data } = await api.get(`/inventory/units${buildQuery(params)}`)
    return toPaginated<InventoryUnit>(data)
  },

  async getUnit(id: string): Promise<InventoryUnit | null> {
    const { data } = await api.get<InventoryUnit>(`/inventory/units/${id}`)
    return data
  },

  async createUnit(payload: CreateUnitRequest): Promise<{ data: InventoryUnit | null; error?: string }> {
    const { data, error } = await api.post<InventoryUnit>('/inventory/units', payload)
    if (error || !data) return { data: null, error: error || 'Failed to create unit' }
    return { data }
  },

  async updateUnit(id: string, payload: Partial<CreateUnitRequest>): Promise<{ data: InventoryUnit | null; error?: string }> {
    const { data, error } = await api.patch<InventoryUnit>(`/inventory/units/${id}`, payload)
    if (error || !data) return { data: null, error: error || 'Failed to update unit' }
    return { data }
  },

  async deleteUnit(id: string): Promise<{ error?: string }> {
    const { error } = await api.delete(`/inventory/units/${id}`)
    return { error: error || undefined }
  },

  async getUnitsDropdown(): Promise<UnitDropdownItem[]> {
    const { data } = await api.get<UnitDropdownItem[]>('/inventory/units/dropdown')
    return toArray<UnitDropdownItem>(data)
  },

  // Locations
  async getLocations(params: ListParams = {}): Promise<Paginated<InventoryLocation>> {
    const { data } = await api.get(`/inventory/locations${buildQuery(params)}`)
    return toPaginated<InventoryLocation>(data)
  },

  async getLocationsTree(): Promise<InventoryLocation[]> {
    const { data } = await api.get<InventoryLocation[]>('/inventory/locations/tree')
    return toArray<InventoryLocation>(data)
  },

  async getLocationsDropdown(): Promise<LocationDropdownItem[]> {
    const { data } = await api.get<LocationDropdownItem[]>('/inventory/locations/dropdown')
    return toArray<LocationDropdownItem>(data)
  },

  async createLocation(payload: CreateLocationRequest): Promise<{ data: InventoryLocation | null; error?: string }> {
    const { data, error } = await api.post<InventoryLocation>('/inventory/locations', payload)
    if (error || !data) return { data: null, error: error || 'Failed to create location' }
    return { data }
  },

  async updateLocation(id: string, payload: Partial<CreateLocationRequest>): Promise<{ data: InventoryLocation | null; error?: string }> {
    const { data, error } = await api.patch<InventoryLocation>(`/inventory/locations/${id}`, payload)
    if (error || !data) return { data: null, error: error || 'Failed to update location' }
    return { data }
  },

  async deleteLocation(id: string): Promise<{ error?: string }> {
    const { error } = await api.delete(`/inventory/locations/${id}`)
    return { error: error || undefined }
  },

  // Items
  async getItems(params: ListParams & { categoryId?: string } = {}): Promise<Paginated<InventoryItemRecord>> {
    const { data } = await api.get(`/inventory/items${buildQuery(params)}`)
    return toPaginated<InventoryItemRecord>(data)
  },

  async getItem(id: string): Promise<InventoryItemRecord | null> {
    const { data } = await api.get<InventoryItemRecord>(`/inventory/items/${id}`)
    return data
  },

  async createItem(payload: CreateItemRequest): Promise<{ data: InventoryItemRecord | null; error?: string }> {
    const { data, error } = await api.post<InventoryItemRecord>('/inventory/items', payload)
    if (error || !data) return { data: null, error: error || 'Failed to create item' }
    return { data }
  },

  async updateItem(id: string, payload: Partial<CreateItemRequest>): Promise<{ data: InventoryItemRecord | null; error?: string }> {
    const { data, error } = await api.patch<InventoryItemRecord>(`/inventory/items/${id}`, payload)
    if (error || !data) return { data: null, error: error || 'Failed to update item' }
    return { data }
  },

  async deleteItem(id: string): Promise<{ error?: string }> {
    const { error } = await api.delete(`/inventory/items/${id}`)
    return { error: error || undefined }
  },

  async getItemsDropdown(): Promise<ItemDropdownItem[]> {
    const { data } = await api.get<ItemDropdownItem[]>('/inventory/items/dropdown')
    return toArray<ItemDropdownItem>(data)
  },

  // GRNs (stock-in)
  async getGrns(params: ListParams & { type?: GrnType } = {}): Promise<Paginated<Grn>> {
    const { data } = await api.get(`/inventory/grns${buildQuery(params)}`)
    const page = toPaginated<Record<string, unknown>>(data)
    return { ...page, data: page.data.map(normalizeGrn) }
  },

  async getGrn(id: string): Promise<Grn | null> {
    const { data } = await api.get<Record<string, unknown>>(`/inventory/grns/${id}`)
    return data ? normalizeGrn(data) : null
  },

  // Wire format confirmed from real VALIDATION_ERROR responses: the API wants
  // sourceType / receivedDate / lines[].qty (whitelist validation — unknown
  // properties are rejected outright).
  async createGrn(payload: CreateGrnRequest): Promise<{ data: Grn | null; error?: string }> {
    const wire = {
      sourceType: payload.type,
      ...(payload.vendorId ? { vendorId: payload.vendorId } : {}),
      receivedDate: payload.date,
      lines: payload.lines.map(l => ({
        itemId: l.itemId,
        qty: l.quantity,
        unitCost: l.unitCost,
        locationId: l.locationId,
        condition: l.condition,
        ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
      })),
    }
    const { data, error } = await api.post<Record<string, unknown>>('/inventory/grns', wire)
    if (error || !data) return { data: null, error: error || 'Failed to create GRN' }
    return { data: normalizeGrn(data) }
  },

  // Issues (stock-out)
  async getIssues(params: ListParams & { targetType?: IssueTargetType } = {}): Promise<Paginated<Issue>> {
    const { data } = await api.get(`/inventory/issues${buildQuery(params)}`)
    const page = toPaginated<Record<string, unknown>>(data)
    return { ...page, data: page.data.map(normalizeIssue) }
  },

  async getIssue(id: string): Promise<Issue | null> {
    const { data } = await api.get<Record<string, unknown>>(`/inventory/issues/${id}`)
    return data ? normalizeIssue(data) : null
  },

  // Wire format confirmed from a real VALIDATION_ERROR response:
  // targetKind / issueDate / lines[].qty.
  async createIssue(payload: CreateIssueRequest): Promise<{ data: Issue | null; error?: string }> {
    const wire = {
      targetKind: payload.targetType,
      ...(payload.targetId ? { targetId: payload.targetId } : {}),
      ...(payload.targetName ? { targetName: payload.targetName } : {}),
      purpose: payload.purpose,
      issueDate: payload.date,
      lines: payload.lines.map(l => ({
        itemId: l.itemId,
        qty: l.quantity,
        locationId: l.locationId,
        condition: l.condition,
      })),
    }
    const { data, error } = await api.post<Record<string, unknown>>('/inventory/issues', wire)
    if (error || !data) return { data: null, error: error || 'Failed to create issue' }
    return { data: normalizeIssue(data) }
  },

  async returnIssue(id: string, payload: ReturnIssueRequest): Promise<{ data: Issue | null; error?: string }> {
    const { data, error } = await api.post<Issue>(`/inventory/issues/${id}/return`, payload)
    if (error || !data) return { data: null, error: error || 'Failed to record return' }
    return { data }
  },

  // Transfers
  async getTransfers(params: ListParams = {}): Promise<Paginated<Transfer>> {
    const { data } = await api.get(`/inventory/transfers${buildQuery(params)}`)
    return toPaginated<Transfer>(data)
  },

  // The API takes ONE item per transfer ({ itemId, qty, fromLocationId,
  // toLocationId, condition } — no lines/date; confirmed from a real
  // VALIDATION_ERROR response). The form allows several rows, so each row is
  // posted as its own transfer, stopping at the first failure.
  async createTransfer(payload: CreateTransferRequest): Promise<{ data: Transfer | null; error?: string }> {
    let last: Transfer | null = null
    for (let i = 0; i < payload.lines.length; i++) {
      const l = payload.lines[i]
      const wire = {
        itemId: l.itemId,
        qty: l.quantity,
        fromLocationId: payload.fromLocationId,
        toLocationId: payload.toLocationId,
        condition: l.condition,
        ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
      }
      const { data, error } = await api.post<Transfer>('/inventory/transfers', wire)
      if (error || !data) {
        const prefix = i > 0 ? `${i} of ${payload.lines.length} lines transferred before this failure. ` : ''
        return { data: last, error: `${prefix}Line ${i + 1}: ${error || 'Failed to create transfer'}` }
      }
      last = data
    }
    return { data: last }
  },

  // Condition changes
  async getConditionChanges(params: ListParams = {}): Promise<Paginated<ConditionChange>> {
    const { data } = await api.get(`/inventory/condition-changes${buildQuery(params)}`)
    return toPaginated<ConditionChange>(data)
  },

  async createConditionChange(payload: CreateConditionChangeRequest): Promise<{ data: ConditionChange | null; error?: string }> {
    const { data, error } = await api.post<ConditionChange>('/inventory/condition-changes', payload)
    if (error || !data) return { data: null, error: error || 'Failed to record condition change' }
    return { data }
  },

  // Adjustments
  async getAdjustments(params: ListParams & { status?: string } = {}): Promise<Paginated<Adjustment>> {
    const { data } = await api.get(`/inventory/adjustments${buildQuery(params)}`)
    return toPaginated<Adjustment>(data)
  },

  async getAdjustment(id: string): Promise<Adjustment | null> {
    const { data } = await api.get<Adjustment>(`/inventory/adjustments/${id}`)
    return data
  },

  async createAdjustment(payload: CreateAdjustmentRequest): Promise<{ data: Adjustment | null; error?: string }> {
    const { data, error } = await api.post<Adjustment>('/inventory/adjustments', payload)
    if (error || !data) return { data: null, error: error || 'Failed to submit adjustment' }
    return { data }
  },

  async decideAdjustment(id: string, decision: AdjustmentDecision, reason?: string): Promise<{ data: Adjustment | null; error?: string }> {
    const path = decision === 'APPROVED' ? 'approve' : 'reject'
    const { data, error } = await api.post<Adjustment>(`/inventory/adjustments/${id}/${path}`, reason ? { reason } : {})
    if (error || !data) return { data: null, error: error || `Failed to ${path} adjustment` }
    return { data }
  },

  // Stock (read views)
  async getStock(params: ListParams = {}): Promise<Paginated<StockBucket>> {
    const { data } = await api.get(`/inventory/stock${buildQuery(params)}`)
    return toPaginated<StockBucket>(data)
  },

  async getStockByItem(itemId: string): Promise<StockByItem | null> {
    const { data } = await api.get<StockByItem>(`/inventory/stock/by-item/${itemId}`)
    return data
  },

  async getStockMovements(params: ListParams & { itemId?: string; type?: string; documentNumber?: string } = {}): Promise<Paginated<StockMovement>> {
    const { data } = await api.get(`/inventory/stock/movements${buildQuery(params)}`)
    return toPaginated<StockMovement>(data)
  },
}
