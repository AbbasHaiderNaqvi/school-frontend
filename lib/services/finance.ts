import { api, toPaginated } from './api-client'

function toArray<T>(raw: unknown): T[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as T[]
  const p = raw as Record<string, unknown>
  if (Array.isArray(p.data)) return p.data as T[]
  return []
}

// Reports may come back bare or wrapped in { data: ... } — unwrap either way.
function unwrapReport(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).data
  }
  return raw
}

// Confirmed response shapes for /finance/reports/trial-balance and /finance/reports/ledger.
export interface TrialBalanceRow {
  glAccountId: string
  code: string
  name: string
  debit: string
  credit: string
}

export interface LedgerRow {
  journalEntryId: string
  entryNo: string
  date: string
  description: string
  status: string
  glAccountId: string
  code: string
  name: string
  debit: string
  credit: string
  memo?: string | null
}

export type GlAccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY'
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'
export type TransactionStatus = 'POSTED' | 'PENDING_APPROVAL' | 'REJECTED' | 'REVERSED'

export interface GlAccount {
  id: string
  code: string
  name: string
  type: GlAccountType
  normalSide: 'DEBIT' | 'CREDIT'
  balance: string
  isActive: boolean
}

export interface CreateGlAccountRequest {
  code: string
  name: string
  type: GlAccountType
  normalSide: 'DEBIT' | 'CREDIT'
  description?: string
}

export interface FinanceTransaction {
  id: string
  reference: string
  type: TransactionType
  amount: string
  description: string
  status: TransactionStatus
  date: string
  categoryAccount?: { code: string; name: string }
  fromAccount?: { code: string; name: string }
  toAccount?: { code: string; name: string }
  paymentAccount?: { code: string; name: string }
}

export interface CreateTransactionRequest {
  type: TransactionType
  amount: string
  description: string
  date: string
  reference?: string
  categoryAccountId?: string
  paymentAccountId?: string
  fromAccountId?: string
  toAccountId?: string
  transferMode?: 'VIA_MASTER' | 'DIRECT'
}

export interface FinanceOverview {
  totalIncome: string
  totalExpense: string
  netBalance: string
  cashBalance: string
  pendingApprovalCount: number
}

export interface PendingExpense {
  id: string
  reference: string
  type: 'EXPENSE'
  amount: string
  description: string
  status: string
  date: string
  categoryAccount?: { code: string; name: string }
  paymentAccount?: { code: string; name: string }
}

// Confirmed shape of GET /finance/budgets — spent/remaining are computed
// server-side; the linked expense account comes flat (categoryCode/categoryName).
export interface Budget {
  id: string
  name: string
  status?: string
  categoryAccountId?: string
  categoryCode?: string
  categoryName?: string
  allocated: string
  spent: string
  remaining: string
  startDate: string
  endDate: string
  createdAt?: string
}

export interface CreateBudgetRequest {
  name: string
  glAccountId: string
  allocatedAmount: string
  startDate: string
  endDate: string
}

export interface ExpenseApprovalSettings {
  enabled: boolean
  threshold: string
}

// GET /finance/expense-approval/history — row shape unconfirmed, so only the
// obvious fields are typed; pages render extra keys dynamically if needed.
export interface ExpenseApprovalHistoryEntry {
  id?: string
  threshold?: string
  enabled?: boolean
  changedByUserId?: string
  changedByName?: string
  createdAt?: string
  [key: string]: unknown
}

export interface Vendor {
  id: string
  name: string
  code: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  paymentTermsDays?: number | null
  notes?: string | null
  isActive?: boolean
  createdAt?: string
  [key: string]: unknown
}

export interface CreateVendorRequest {
  name: string
  code: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  paymentTermsDays?: number
  notes?: string
}

// Vendor response casing unconfirmed — normalize both, like the other services.
function normalizeVendor(raw: Record<string, unknown>): Vendor {
  return {
    ...raw,
    id: raw.id as string,
    name: raw.name as string,
    code: raw.code as string,
    contactPerson: (raw.contactPerson ?? raw.contact_person) as string | null | undefined,
    phone: raw.phone as string | null | undefined,
    email: raw.email as string | null | undefined,
    address: raw.address as string | null | undefined,
    paymentTermsDays: (raw.paymentTermsDays ?? raw.payment_terms_days) != null
      ? Number(raw.paymentTermsDays ?? raw.payment_terms_days)
      : undefined,
    notes: raw.notes as string | null | undefined,
    isActive: (raw.isActive ?? raw.is_active) as boolean | undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
  }
}

export type BudgetChangeRequestStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED'

export interface BudgetChangeRequest {
  id: string
  budgetId: string
  budgetName?: string
  fromAllocated?: string
  toAllocated: string
  reason?: string
  status: BudgetChangeRequestStatus | string
  createdAt?: string
  [key: string]: unknown
}

// Response casing unconfirmed — normalize both camelCase and snake_case so the
// workflow buttons (keyed off status) can never silently disappear.
function normalizeBudgetChangeRequest(raw: Record<string, unknown>): BudgetChangeRequest {
  return {
    ...raw,
    id: raw.id as string,
    budgetId: (raw.budgetId ?? raw.budget_id) as string,
    budgetName: (raw.budgetName ?? raw.budget_name) as string | undefined,
    fromAllocated: (raw.fromAllocated ?? raw.from_allocated) as string | undefined,
    toAllocated: (raw.toAllocated ?? raw.to_allocated) as string,
    reason: raw.reason as string | undefined,
    status: String(raw.status ?? '').toUpperCase(),
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
  }
}

// No sample response was given for /finance/periods, so this stays loose
// (just `id` guaranteed) rather than guessing field names — the UI renders
// whatever keys actually come back instead of assuming a fixed shape.
export interface FiscalPeriod {
  id: string
  [key: string]: unknown
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ListTransactionsParams {
  page?: number
  limit?: number
  type?: TransactionType
  status?: TransactionStatus
  from?: string
  to?: string
  search?: string
}

export const financeService = {
  // GL Accounts
  async getGLAccounts(params: { type?: GlAccountType; isActive?: boolean; search?: string } = {}): Promise<GlAccount[]> {
    const query = new URLSearchParams()
    if (params.type) query.set('type', params.type)
    if (params.isActive !== undefined) query.set('isActive', String(params.isActive))
    if (params.search) query.set('search', params.search)
    const qs = query.toString()
    const { data, error } = await api.get<unknown>(`/finance/gl-accounts${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    return toArray<GlAccount>(data)
  },

  async createGLAccount(payload: CreateGlAccountRequest): Promise<{ account: GlAccount | null; error?: string }> {
    const { data, error } = await api.post<GlAccount>('/finance/gl-accounts', payload)
    if (error || !data) return { account: null, error: error || 'Failed to create GL account' }
    return { account: data }
  },

  async updateGLAccount(id: string, payload: Partial<CreateGlAccountRequest>): Promise<GlAccount | null> {
    const { data } = await api.patch<GlAccount>(`/finance/gl-accounts/${id}`, payload)
    return data || null
  },

  async bootstrapDefaultGL(): Promise<{ created: number; accounts: GlAccount[] } | null> {
    const { data } = await api.post<{ created: number; accounts: GlAccount[] }>('/finance/bootstrap/default-gl', {})
    return data || null
  },

  // Transactions
  async getTransactions(params: ListTransactionsParams = {}): Promise<Paginated<FinanceTransaction>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.type) query.set('type', params.type)
    if (params.status) query.set('status', params.status)
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    if (params.search) query.set('search', params.search)
    const qs = query.toString()
    const { data, error } = await api.get<Paginated<FinanceTransaction>>(`/finance/transactions${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    return toPaginated(data)
  },

  async createTransaction(payload: CreateTransactionRequest): Promise<{ transaction: FinanceTransaction | null; error?: string; status?: number }> {
    const { data, error, status } = await api.post<FinanceTransaction>('/finance/transactions', payload)
    if (error || !data) return { transaction: null, error: error || 'Failed to create transaction', status }
    return { transaction: data, status }
  },

  // Pending expense approvals
  async getPendingExpenses(): Promise<FinanceTransaction[]> {
    const { data, error } = await api.get<unknown>('/finance/expenses/pending')
    if (error) throw new Error(error)
    return toArray<FinanceTransaction>(data)
  },

  async approveExpense(id: string, notes?: string): Promise<boolean> {
    const { error } = await api.post(`/finance/expenses/${id}/approve`, { notes })
    return !error
  },

  async rejectExpense(id: string, reason: string): Promise<boolean> {
    const { error } = await api.post(`/finance/expenses/${id}/reject`, { reason })
    return !error
  },

  // Overview / dashboard
  async getOverview(): Promise<FinanceOverview | null> {
    const { data, error } = await api.get<FinanceOverview>('/finance/overview')
    if (error) throw new Error(error)
    return data || null
  },

  // Reports
  async getTrialBalance(params: { asOf?: string } = {}): Promise<TrialBalanceRow[]> {
    const query = new URLSearchParams()
    if (params.asOf) query.set('asOf', params.asOf)
    const qs = query.toString()
    const { data } = await api.get(`/finance/reports/trial-balance${qs ? `?${qs}` : ''}`)
    const rows = unwrapReport(data)
    return Array.isArray(rows) ? (rows as TrialBalanceRow[]) : []
  },

  async getLedger(params: { glAccountId: string; from?: string; to?: string }): Promise<LedgerRow[]> {
    const query = new URLSearchParams({ glAccountId: params.glAccountId })
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    const { data } = await api.get(`/finance/reports/ledger?${query.toString()}`)
    const rows = unwrapReport(data)
    return Array.isArray(rows) ? (rows as LedgerRow[]) : []
  },

  async getStatement(params: { from?: string; to?: string } = {}): Promise<unknown> {
    const query = new URLSearchParams()
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    const qs = query.toString()
    const { data } = await api.get(`/finance/reports/statement${qs ? `?${qs}` : ''}`)
    return unwrapReport(data)
  },

  async getIncomeStatement(params: { from?: string; to?: string } = {}): Promise<unknown> {
    const query = new URLSearchParams()
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    const qs = query.toString()
    const { data } = await api.get(`/finance/reports/income-statement${qs ? `?${qs}` : ''}`)
    return unwrapReport(data)
  },

  async getBalanceSheet(params: { asOf?: string } = {}): Promise<unknown> {
    const query = new URLSearchParams()
    if (params.asOf) query.set('asOf', params.asOf)
    const qs = query.toString()
    const { data } = await api.get(`/finance/reports/balance-sheet${qs ? `?${qs}` : ''}`)
    return unwrapReport(data)
  },

  // Settings
  async getSettings(): Promise<Record<string, string> | null> {
    const { data } = await api.get<Record<string, string>>('/finance/settings')
    return data || null
  },

  async updateSetting(key: string, value: string): Promise<boolean> {
    const { error } = await api.put('/finance/settings', { key, value })
    return !error
  },

  // Expense approval threshold
  async getExpenseApproval(): Promise<ExpenseApprovalSettings | null> {
    const { data, error } = await api.get<ExpenseApprovalSettings>('/finance/expense-approval')
    if (error) throw new Error(error)
    return data || null
  },

  async updateExpenseApproval(payload: ExpenseApprovalSettings): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.put('/finance/expense-approval', payload)
    return { success: !error, error: error ?? undefined }
  },

  async getExpenseApprovalHistory(): Promise<ExpenseApprovalHistoryEntry[]> {
    const { data, error } = await api.get<unknown>('/finance/expense-approval/history')
    if (error) throw new Error(error)
    return toArray<ExpenseApprovalHistoryEntry>(data)
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await api.get<unknown>('/finance/budgets')
    if (error) throw new Error(error)
    return toArray<Budget>(data)
  },

  async getBudget(id: string): Promise<Budget | null> {
    const { data } = await api.get<Budget>(`/finance/budgets/${id}`)
    return data || null
  },

  async createBudget(payload: CreateBudgetRequest): Promise<{ budget: Budget | null; error?: string }> {
    const { data, error } = await api.post<Budget>('/finance/budgets', payload)
    if (error || !data) return { budget: null, error: error || 'Failed to create budget' }
    return { budget: data }
  },

  // Only name and status can change here — allocation changes go through the
  // Budget Change Request flow. ACTIVE → CLOSED is permanent.
  async updateBudget(id: string, payload: { name?: string; status?: string }): Promise<{ budget: Budget | null; error?: string }> {
    const { data, error } = await api.patch<Budget>(`/finance/budgets/${id}`, payload)
    if (error || !data) return { budget: null, error: error || 'Failed to update budget' }
    return { budget: data }
  },

  // Budget Change Requests — reallocation flow (guide §11):
  // DRAFT → SUBMITTED → APPROVED/REJECTED → APPLIED
  async getBudgetChangeRequests(): Promise<BudgetChangeRequest[]> {
    const { data, error } = await api.get<unknown>('/finance/budget-change-requests')
    if (error) throw new Error(error)
    return toArray<Record<string, unknown>>(data).map(normalizeBudgetChangeRequest)
  },

  async getBudgetChangeRequest(id: string): Promise<BudgetChangeRequest | null> {
    const { data } = await api.get<Record<string, unknown>>(`/finance/budget-change-requests/${id}`)
    return data ? normalizeBudgetChangeRequest(data) : null
  },

  async createBudgetChangeRequest(payload: { budgetId: string; toAllocated: string; reason: string }): Promise<{ request: BudgetChangeRequest | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/finance/budget-change-requests', payload)
    if (error || !data) return { request: null, error: error || 'Failed to create change request' }
    return { request: normalizeBudgetChangeRequest(data) }
  },

  async actOnBudgetChangeRequest(id: string, action: 'submit' | 'approve' | 'reject' | 'apply', reason?: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.post(`/finance/budget-change-requests/${id}/${action}`, reason ? { reason } : {})
    return { success: !error, error: error ?? undefined }
  },

  // Fiscal Periods
  async getPeriods(): Promise<FiscalPeriod[]> {
    const { data, error } = await api.get<unknown>('/finance/periods')
    if (error) throw new Error(error)
    return toArray<FiscalPeriod>(data)
  },

  // No sample payload was given — best guess is a periodId reference (periods
  // are listed with an id), sent only if provided in case the backend instead
  // just closes/reopens "the current period" with no body at all.
  async closePeriod(periodId?: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.post('/finance/periods/close', periodId ? { periodId } : {})
    return { success: !error, error: error ?? undefined }
  },

  async reopenPeriod(periodId?: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await api.post('/finance/periods/reopen', periodId ? { periodId } : {})
    return { success: !error, error: error ?? undefined }
  },

  // Vendors
  async getVendorsDropdown(): Promise<Array<{ id: string; name: string; code: string }>> {
    const { data } = await api.get<Array<{ id: string; name: string; code: string }>>('/finance/vendors/dropdown')
    return toArray(data)
  },

  async getVendors(params: { page?: number; limit?: number; search?: string } = {}): Promise<Paginated<Vendor>> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    const qs = q.toString()
    const { data, error } = await api.get<unknown>(`/finance/vendors${qs ? `?${qs}` : ''}`)
    if (error) throw new Error(error)
    const page = toPaginated<Record<string, unknown>>(data)
    return { ...page, data: page.data.map(normalizeVendor) }
  },

  async getVendor(id: string): Promise<Vendor | null> {
    const { data } = await api.get<Record<string, unknown>>(`/finance/vendors/${id}`)
    return data ? normalizeVendor(data) : null
  },

  async createVendor(payload: CreateVendorRequest): Promise<{ vendor: Vendor | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/finance/vendors', payload)
    if (error || !data) return { vendor: null, error: error || 'Failed to create vendor' }
    return { vendor: normalizeVendor(data) }
  },

  async updateVendor(id: string, payload: Partial<CreateVendorRequest>): Promise<{ vendor: Vendor | null; error?: string }> {
    const { data, error } = await api.patch<Record<string, unknown>>(`/finance/vendors/${id}`, payload)
    if (error || !data) return { vendor: null, error: error || 'Failed to update vendor' }
    return { vendor: normalizeVendor(data) }
  },

  async deleteVendor(id: string): Promise<{ error?: string }> {
    const { error } = await api.delete(`/finance/vendors/${id}`)
    return { error: error || undefined }
  },
}
