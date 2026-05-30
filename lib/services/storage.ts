// Storage service - abstracts localStorage for easy API migration later

const isBrowser = typeof window !== 'undefined'

export const storage = {
  get<T>(key: string): T | null {
    if (!isBrowser) return null
    const item = localStorage.getItem(key)
    if (!item) return null
    try {
      return JSON.parse(item) as T
    } catch {
      return null
    }
  },

  set<T>(key: string, value: T): void {
    if (!isBrowser) return
    localStorage.setItem(key, JSON.stringify(value))
  },

  remove(key: string): void {
    if (!isBrowser) return
    localStorage.removeItem(key)
  },

  clear(): void {
    if (!isBrowser) return
    localStorage.clear()
  },
}

// Storage keys
export const STORAGE_KEYS = {
  USERS: 'erp_users',
  TENANTS: 'erp_tenants',
  CURRENT_USER: 'erp_current_user',
  GL_ACCOUNTS: 'erp_gl_accounts',
  TRANSACTIONS: 'erp_transactions',
  FINANCIAL_TRANSACTIONS: 'erp_financial_transactions',
  RECEIPTS: 'erp_receipts',
  BUDGETS: 'erp_budgets',
  EXPENSES: 'erp_expenses',
  THRESHOLD_HISTORY: 'erp_threshold_history',
  FEE_STRUCTURES: 'erp_fee_structures',
  INVOICES: 'erp_invoices',
  PAYMENTS: 'erp_payments',
  STUDENTS: 'erp_students',
  STUDENT_FEES: 'erp_student_fees',
  PARENTS: 'erp_parents',
  EMPLOYEES: 'erp_employees',
  JOB_OPENINGS: 'erp_job_openings',
  JOB_APPLICATIONS: 'erp_job_applications',
  LEAVE_REQUESTS: 'erp_leave_requests',
  ATTENDANCE: 'erp_attendance',
  ASSETS: 'erp_assets',
  INVENTORY: 'erp_inventory',
  TASKS: 'erp_tasks',
  TASK_BOARDS: 'erp_task_boards',
  INVENTORY_MOVEMENTS: 'erp_inventory_movements',
  PAYROLL_RECORDS: 'erp_payroll_records',
  AUDIT_LOGS: 'erp_audit_logs',
} as const
