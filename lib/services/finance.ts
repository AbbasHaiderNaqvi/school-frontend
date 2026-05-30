import { api } from './api-client'

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
  categoryAccountId?: string
  paymentAccountId?: string
  fromAccountId?: string
  toAccountId?: string
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
  glAccountId: string
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
    const { data } = await api.get<GlAccount[]>(`/finance/gl-accounts${qs ? `?${qs}` : ''}`)
    return data || []
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
    const { data } = await api.get<Paginated<FinanceTransaction>>(`/finance/transactions${qs ? `?${qs}` : ''}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async createTransaction(payload: CreateTransactionRequest): Promise<{ transaction: FinanceTransaction | null; error?: string; status?: number }> {
    const { data, error, status } = await api.post<FinanceTransaction>('/finance/transactions', payload)
    if (error || !data) return { transaction: null, error: error || 'Failed to create transaction', status }
    return { transaction: data, status }
  },

  // Pending expense approvals
  async getPendingExpenses(): Promise<FinanceTransaction[]> {
    const { data } = await api.get<FinanceTransaction[]>('/finance/expenses/pending')
    return data || []
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
    const { data } = await api.get<FinanceOverview>('/finance/overview')
    return data || null
  },

  // Reports
  async getTrialBalance(asOf?: string): Promise<unknown> {
    const qs = asOf ? `?asOf=${asOf}` : ''
    const { data } = await api.get(`/finance/reports/trial-balance${qs}`)
    return data
  },

  async getLedger(accountId: string, from?: string, to?: string): Promise<unknown> {
    const query = new URLSearchParams({ accountId })
    if (from) query.set('from', from)
    if (to) query.set('to', to)
    const { data } = await api.get(`/finance/reports/ledger?${query.toString()}`)
    return data
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
    const { data } = await api.get<ExpenseApprovalSettings>('/finance/expense-approval')
    return data || null
  },

  async updateExpenseApproval(payload: ExpenseApprovalSettings): Promise<boolean> {
    const { error } = await api.put('/finance/expense-approval', payload)
    return !error
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    const { data } = await api.get<Budget[]>('/finance/budgets')
    return data || []
  },

  async createBudget(payload: CreateBudgetRequest): Promise<{ budget: Budget | null; error?: string }> {
    const { data, error } = await api.post<Budget>('/finance/budgets', payload)
    if (error || !data) return { budget: null, error: error || 'Failed to create budget' }
    return { budget: data }
  },
}
