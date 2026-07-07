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

export interface Budget {
  id: string
  name: string
  glAccountId?: string
  glAccount?: { id: string; code: string; name: string }
  allocatedAmount: string
  startDate: string
  endDate: string
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
  async getTrialBalance(params: { asOf?: string } = {}): Promise<unknown> {
    const query = new URLSearchParams()
    if (params.asOf) query.set('asOf', params.asOf)
    const qs = query.toString()
    const { data } = await api.get(`/finance/reports/trial-balance${qs ? `?${qs}` : ''}`)
    return unwrapReport(data)
  },

  async getLedger(params: { glAccountId: string; from?: string; to?: string }): Promise<unknown> {
    const query = new URLSearchParams({ glAccountId: params.glAccountId })
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    const { data } = await api.get(`/finance/reports/ledger?${query.toString()}`)
    return unwrapReport(data)
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

  async updateExpenseApproval(payload: ExpenseApprovalSettings): Promise<boolean> {
    const { error } = await api.put('/finance/expense-approval', payload)
    return !error
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await api.get<unknown>('/finance/budgets')
    if (error) throw new Error(error)
    return toArray<Budget>(data)
  },

  async createBudget(payload: CreateBudgetRequest): Promise<{ budget: Budget | null; error?: string }> {
    const { data, error } = await api.post<Budget>('/finance/budgets', payload)
    if (error || !data) return { budget: null, error: error || 'Failed to create budget' }
    return { budget: data }
  },
}
