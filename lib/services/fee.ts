import { api } from './api-client'

export type FeeComponentType =
  | 'TUITION' | 'ADMISSION' | 'EXAM' | 'TRANSPORT'
  | 'LIBRARY' | 'SPORTS' | 'LAB' | 'UNIFORM' | 'MISCELLANEOUS'

export type FeeStructureStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'
export type InvoiceStatus = 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID'
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE_PAYMENT' | 'CHEQUE' | 'MOBILE_WALLET'
export type PaymentStatus = 'COMPLETED' | 'REVERSED' | 'REFUNDED' | 'VOIDED'
export type DiscountType = 'SCHOLARSHIP' | 'SIBLING_DISCOUNT' | 'STAFF_DISCOUNT' | 'NEED_BASED' | 'MERIT' | 'OTHER'
export type DiscountMode = 'PERCENTAGE' | 'FIXED'
export type DiscountStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface FeeComponent {
  id: string
  tenantId: string
  name: string
  description?: string
  defaultAmount: string
  componentType: FeeComponentType
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface FeeStructureComponent {
  id: string
  feeStructureId: string
  feeComponentId?: string
  name: string
  amount: string
  dueDate?: string
  isMandatory: boolean
  glAccountId?: string
  sortOrder: number
}

export interface FeeStructure {
  id: string
  tenantId: string
  classId: string
  className?: string
  academicYear: string
  name: string
  notes?: string
  totalAmount: string
  status: FeeStructureStatus
  componentCount?: number
  components?: FeeStructureComponent[]
  activatedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface FeeInvoiceLine {
  id: string
  invoiceId: string
  componentName: string
  amount: string
  description?: string
  sortOrder: number
}

export interface FeeInvoice {
  id: string
  tenantId: string
  invoiceNo: string
  studentId: string
  studentName?: string
  classId: string
  className?: string
  academicYear: string
  month?: string
  issueDate: string
  dueDate: string
  feeStructureId?: string
  totalAmount: string
  discountAmount: string
  netAmount: string
  paidAmount: string
  balanceAmount: string
  status: InvoiceStatus
  notes?: string
  lines?: FeeInvoiceLine[]
  createdAt: string
  updatedAt?: string
}

export interface FeePayment {
  id: string
  tenantId: string
  invoiceId: string
  studentId: string
  amount: string
  paymentMethod: PaymentMethod
  paymentDate: string
  referenceNo?: string
  notes?: string
  status: PaymentStatus
  createdAt: string
}

export interface FeeReceipt {
  id: string
  tenantId: string
  receiptNo: string
  invoiceId: string
  invoiceNo: string
  paymentId: string
  studentId: string
  amount: string
  issuedAt: string
  isVoided: boolean
  createdAt: string
}

export interface ReceiptPrintData {
  receiptNo: string
  issuedAt: string
  tenant: { name: string; address?: string; phone?: string; email?: string; logoUrl?: string }
  student: { id: string; fullName: string; userCode: string; className?: string }
  invoice: { invoiceNo: string; academicYear: string; month?: string; dueDate: string; netAmount: string; discountAmount: string; balanceAfterPayment: string }
  payment: { amount: string; method: PaymentMethod; referenceNo?: string; paymentDate: string }
  lines: Array<{ componentName: string; amount: string }>
}

export interface FeeDiscount {
  id: string
  tenantId: string
  studentId: string
  studentName?: string
  invoiceId?: string
  academicYear: string
  type: DiscountType
  discountMode: DiscountMode
  value: string
  resolvedAmount?: string
  reason: string
  status: DiscountStatus
  approvedByUserId?: string
  approvedAt?: string
  rejectionReason?: string
  createdAt: string
}

export interface StudentFeeAssignment {
  id: string
  tenantId: string
  studentId: string
  studentName?: string
  feeStructureId: string
  classId: string
  academicYear: string
  totalFee: string
  discountAmount: string
  netAmount: string
  paidAmount: string
  balanceAmount: string
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  createdAt: string
}

export interface StudentFeeDetail {
  student: { id: string; fullName: string; userCode: string; className?: string; academicYear?: string }
  feeAssignment?: StudentFeeAssignment
  invoices: FeeInvoice[]
  payments: FeePayment[]
  discounts: FeeDiscount[]
  summary: { totalInvoiced: string; totalPaid: string; totalDiscount: string; outstanding: string }
}

export interface FeeDashboardSummary {
  totalInvoiced: string
  totalCollected: string
  totalOutstanding: string
  totalOverdue: string
  collectionRate: string
}

export interface FeeSettings {
  tenantId: string
  receiptPrefix: string
  allowPartialPayment: boolean
  allowAdvancePayment: boolean
  lateFeeEnabled: boolean
  financeIntegrationEnabled: boolean
  defaultReceivableAccountId?: string
  defaultFeeIncomeAccountId?: string
  defaultCashAccountId?: string
  lateFeeRule?: LateFeeRule
}

export interface LateFeeRule {
  enabled: boolean
  chargeType: 'PERCENTAGE' | 'FIXED'
  chargeValue: string
  gracePeriodDays: number
  compoundingEnabled: boolean
}

export interface FinanceMapping {
  defaultReceivableAccountId?: string
  defaultFeeIncomeAccountId?: string
  defaultCashAccountId?: string
  defaultBankAccountId?: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

function buildQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const feeService = {
  // ── Fee Components ──────────────────────────────────────────────────────────
  async getComponents(params: { page?: number; limit?: number; search?: string; isActive?: boolean } = {}): Promise<Paginated<FeeComponent>> {
    const { data } = await api.get<Paginated<FeeComponent>>(`/fees/components${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async createComponent(payload: { name: string; defaultAmount: string; description?: string; componentType?: FeeComponentType; glAccountId?: string }): Promise<{ component: FeeComponent | null; error?: string }> {
    const { data, error } = await api.post<FeeComponent>('/fees/components', payload)
    if (error || !data) return { component: null, error: error || 'Failed to create component' }
    return { component: data }
  },

  async updateComponent(id: string, payload: { name?: string; defaultAmount?: string; description?: string; isActive?: boolean }): Promise<FeeComponent | null> {
    const { data } = await api.patch<FeeComponent>(`/fees/components/${id}`, payload)
    return data || null
  },

  async deleteComponent(id: string): Promise<boolean> {
    const { error } = await api.delete(`/fees/components/${id}`)
    return !error
  },

  // ── Fee Structures ───────────────────────────────────────────────────────────
  async getStructures(params: { page?: number; limit?: number; classId?: string; academicYear?: string; status?: FeeStructureStatus; search?: string } = {}): Promise<Paginated<FeeStructure>> {
    const { data } = await api.get<Paginated<FeeStructure>>(`/fees/structures${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getStructureById(id: string): Promise<FeeStructure | null> {
    const { data } = await api.get<FeeStructure>(`/fees/structures/${id}`)
    return data || null
  },

  async createStructure(payload: { classId: string; academicYear: string; name: string; notes?: string; components: Array<{ name: string; amount: string; feeComponentId?: string; dueDate?: string; isMandatory?: boolean; glAccountId?: string; sortOrder?: number }> }): Promise<{ structure: FeeStructure | null; error?: string }> {
    const { data, error } = await api.post<FeeStructure>('/fees/structures', payload)
    if (error || !data) return { structure: null, error: error || 'Failed to create structure' }
    return { structure: data }
  },

  async updateStructure(id: string, payload: { name?: string; academicYear?: string; notes?: string; components?: Array<{ name: string; amount: string; feeComponentId?: string; dueDate?: string; isMandatory?: boolean; glAccountId?: string; sortOrder?: number }> }): Promise<FeeStructure | null> {
    const { data } = await api.patch<FeeStructure>(`/fees/structures/${id}`, payload)
    return data || null
  },

  async deleteStructure(id: string): Promise<boolean> {
    const { error } = await api.delete(`/fees/structures/${id}`)
    return !error
  },

  async activateStructure(id: string): Promise<{ structure: FeeStructure | null; error?: string }> {
    const { data, error } = await api.post<FeeStructure>(`/fees/structures/${id}/activate`, {})
    if (error || !data) return { structure: null, error: error || 'Failed to activate' }
    return { structure: data }
  },

  async deactivateStructure(id: string): Promise<FeeStructure | null> {
    const { data } = await api.post<FeeStructure>(`/fees/structures/${id}/deactivate`, {})
    return data || null
  },

  async duplicateStructure(id: string): Promise<FeeStructure | null> {
    const { data } = await api.post<FeeStructure>(`/fees/structures/${id}/duplicate`, {})
    return data || null
  },

  async applyStructureToStudents(id: string, studentIds?: string[]): Promise<{ applied: number; skipped: number } | null> {
    const { data } = await api.post<{ applied: number; skipped: number }>(`/fees/structures/${id}/apply-to-students`, { studentIds })
    return data || null
  },

  async copyStructureToYear(id: string, payload: { academicYear: string; classId?: string; name?: string; notes?: string; componentOverrides?: Array<{ originalComponentId: string; newAmount: string }> }): Promise<{ structure: FeeStructure | null; error?: string }> {
    const { data, error } = await api.post<FeeStructure>(`/fees/structures/${id}/copy-to-year`, payload)
    if (error || !data) return { structure: null, error: error || 'Failed to copy' }
    return { structure: data }
  },

  // ── Invoices ─────────────────────────────────────────────────────────────────
  async getInvoices(params: { page?: number; limit?: number; studentId?: string; classId?: string; academicYear?: string; month?: string; status?: InvoiceStatus; from?: string; to?: string; search?: string } = {}): Promise<Paginated<FeeInvoice>> {
    const { data } = await api.get<Paginated<FeeInvoice>>(`/fees/invoices${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getInvoiceById(id: string): Promise<FeeInvoice | null> {
    const { data } = await api.get<FeeInvoice>(`/fees/invoices/${id}`)
    return data || null
  },

  async createInvoice(payload: { studentId: string; classId: string; academicYear: string; month?: string; issueDate: string; dueDate: string; feeStructureId?: string; notes?: string; lines: Array<{ componentName: string; amount: string; description?: string }> }): Promise<{ invoice: FeeInvoice | null; error?: string }> {
    const { data, error } = await api.post<FeeInvoice>('/fees/invoices', payload)
    if (error || !data) return { invoice: null, error: error || 'Failed to create invoice' }
    return { invoice: data }
  },

  async generateInvoices(payload: { classId: string; feeStructureId: string; academicYear: string; issueDate: string; dueDate: string; month?: string; studentIds?: string[] }): Promise<{ generated: number; skipped: number } | null> {
    const { data } = await api.post<{ generated: number; skipped: number }>('/fees/invoices/generate', payload)
    return data || null
  },

  async cancelInvoice(id: string, reason?: string): Promise<{ invoice: FeeInvoice | null; error?: string }> {
    const { data, error } = await api.post<FeeInvoice>(`/fees/invoices/${id}/cancel`, { reason })
    if (error || !data) return { invoice: null, error: error || 'Failed to cancel invoice' }
    return { invoice: data }
  },

  async recalculateInvoice(id: string): Promise<boolean> {
    const { error } = await api.post(`/fees/invoices/${id}/recalculate`, {})
    return !error
  },

  async postInvoiceToFinance(id: string): Promise<{ invoice: FeeInvoice | null; error?: string }> {
    const { data, error } = await api.post<FeeInvoice>(`/fees/invoices/${id}/post-to-finance`, {})
    if (error || !data) return { invoice: null, error: error || 'Failed to post' }
    return { invoice: data }
  },

  async markInvoiceOverdue(id: string): Promise<FeeInvoice | null> {
    const { data } = await api.post<FeeInvoice>(`/fees/invoices/${id}/mark-overdue`, {})
    return data || null
  },

  // ── Payments ─────────────────────────────────────────────────────────────────
  async getPayments(params: { page?: number; limit?: number; studentId?: string; invoiceId?: string; paymentMethod?: PaymentMethod; status?: PaymentStatus; from?: string; to?: string } = {}): Promise<Paginated<FeePayment>> {
    const { data } = await api.get<Paginated<FeePayment>>(`/fees/payments${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getPaymentById(id: string): Promise<FeePayment | null> {
    const { data } = await api.get<FeePayment>(`/fees/payments/${id}`)
    return data || null
  },

  async recordPayment(payload: { invoiceId: string; amount: string; paymentMethod: PaymentMethod; paymentDate: string; referenceNo?: string; notes?: string; receivedByUserId?: string }): Promise<{ payment: FeePayment | null; receipt: FeeReceipt | null; error?: string }> {
    const { data, error } = await api.post<{ payment: FeePayment; receipt: FeeReceipt }>('/fees/payments', payload)
    if (error || !data) return { payment: null, receipt: null, error: error || 'Failed to record payment' }
    return { payment: data.payment, receipt: data.receipt }
  },

  async reversePayment(id: string, reason: string): Promise<{ payment: FeePayment | null; error?: string }> {
    const { data, error } = await api.post<FeePayment>(`/fees/payments/${id}/reverse`, { reason })
    if (error || !data) return { payment: null, error: error || 'Failed to reverse payment' }
    return { payment: data }
  },

  async refundPayment(id: string, reason: string): Promise<{ payment: FeePayment | null; error?: string }> {
    const { data, error } = await api.post<FeePayment>(`/fees/payments/${id}/refund`, { reason })
    if (error || !data) return { payment: null, error: error || 'Failed to refund payment' }
    return { payment: data }
  },

  // ── Receipts ─────────────────────────────────────────────────────────────────
  async getReceipts(params: { page?: number; limit?: number; studentId?: string; invoiceId?: string; paymentId?: string; isVoided?: boolean } = {}): Promise<Paginated<FeeReceipt>> {
    const { data } = await api.get<Paginated<FeeReceipt>>(`/fees/receipts${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getReceiptById(id: string): Promise<FeeReceipt | null> {
    const { data } = await api.get<FeeReceipt>(`/fees/receipts/${id}`)
    return data || null
  },

  async getReceiptPrintData(id: string): Promise<ReceiptPrintData | null> {
    const { data } = await api.get<ReceiptPrintData>(`/fees/receipts/${id}/print`)
    return data || null
  },

  async voidReceipt(id: string, reason: string): Promise<{ receipt: FeeReceipt | null; error?: string }> {
    const { data, error } = await api.post<FeeReceipt>(`/fees/receipts/${id}/void`, { reason })
    if (error || !data) return { receipt: null, error: error || 'Failed to void receipt' }
    return { receipt: data }
  },

  // ── Discounts ────────────────────────────────────────────────────────────────
  async getDiscounts(params: { page?: number; limit?: number; studentId?: string; academicYear?: string; type?: DiscountType; status?: DiscountStatus } = {}): Promise<Paginated<FeeDiscount>> {
    const { data } = await api.get<Paginated<FeeDiscount>>(`/fees/discounts${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async createDiscount(payload: { studentId: string; invoiceId?: string; academicYear: string; type: DiscountType; discountMode: DiscountMode; value: string; reason: string }): Promise<{ discount: FeeDiscount | null; error?: string }> {
    const { data, error } = await api.post<FeeDiscount>('/fees/discounts', payload)
    if (error || !data) return { discount: null, error: error || 'Failed to create discount' }
    return { discount: data }
  },

  async approveDiscount(id: string, notes?: string): Promise<{ discount: FeeDiscount | null; error?: string }> {
    const { data, error } = await api.post<FeeDiscount>(`/fees/discounts/${id}/approve`, { notes })
    if (error || !data) return { discount: null, error: error || 'Failed to approve' }
    return { discount: data }
  },

  async rejectDiscount(id: string, reason: string): Promise<{ discount: FeeDiscount | null; error?: string }> {
    const { data, error } = await api.post<FeeDiscount>(`/fees/discounts/${id}/reject`, { reason })
    if (error || !data) return { discount: null, error: error || 'Failed to reject' }
    return { discount: data }
  },

  async deleteDiscount(id: string): Promise<boolean> {
    const { error } = await api.delete(`/fees/discounts/${id}`)
    return !error
  },

  // ── Overdue ──────────────────────────────────────────────────────────────────
  async getOverdueInvoices(params: { page?: number; limit?: number; classId?: string; academicYear?: string } = {}): Promise<Paginated<FeeInvoice>> {
    const { data } = await api.get<Paginated<FeeInvoice>>(`/fees/overdue${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getDefaulters(params: { classId?: string; academicYear?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/overdue/defaulters${buildQS(params)}`)
    return data
  },

  async applyLateFees(): Promise<{ processed: number; applied: number; skipped: number } | null> {
    const { data } = await api.post<{ processed: number; applied: number; skipped: number }>('/fees/overdue/apply-late-fees', {})
    return data || null
  },

  async sendReminders(): Promise<{ queued: number } | null> {
    const { data } = await api.post<{ queued: number }>('/fees/overdue/send-reminders', {})
    return data || null
  },

  // ── Student Fee Detail ────────────────────────────────────────────────────────
  async getStudentFees(params: { page?: number; limit?: number; classId?: string; academicYear?: string; status?: string } = {}): Promise<Paginated<StudentFeeAssignment>> {
    const { data } = await api.get<Paginated<StudentFeeAssignment>>(`/fees/student-fees${buildQS(params)}`)
    return data || { data: [], total: 0, page: 1, limit: 20 }
  },

  async getStudentFeeDetail(studentId: string): Promise<StudentFeeDetail | null> {
    const { data } = await api.get<StudentFeeDetail>(`/fees/student-fees/${studentId}/detail`)
    return data || null
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  async getDashboardSummary(): Promise<FeeDashboardSummary | null> {
    const { data } = await api.get<FeeDashboardSummary>('/fees/dashboard/summary')
    return data || null
  },

  async getCollectionChart(params: { groupBy?: 'month' | 'week' | 'day'; from?: string; to?: string } = {}): Promise<Array<{ period: string; collected: string; invoiced: string }>> {
    const { data } = await api.get<Array<{ period: string; collected: string; invoiced: string }>>(`/fees/dashboard/collection-chart${buildQS(params)}`)
    return data || []
  },

  async getClassWiseSummary(): Promise<Array<{ classId: string; className: string; totalInvoiced: string; totalCollected: string; outstanding: string; studentCount: number }>> {
    const { data } = await api.get<Array<{ classId: string; className: string; totalInvoiced: string; totalCollected: string; outstanding: string; studentCount: number }>>('/fees/dashboard/class-wise-summary')
    return data || []
  },

  async getOverdueSummary(): Promise<unknown> {
    const { data } = await api.get('/fees/dashboard/overdue-summary')
    return data
  },

  // ── Reports ──────────────────────────────────────────────────────────────────
  async getCollectionSummaryReport(params: { from?: string; to?: string; classId?: string; academicYear?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/collection-summary${buildQS(params)}`)
    return data
  },

  async getClassWiseCollectionReport(params: { academicYear?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/class-wise-collection${buildQS(params)}`)
    return data
  },

  async getStudentLedger(studentId: string, params: { academicYear?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/student-ledger/${studentId}${buildQS(params)}`)
    return data
  },

  async getOutstandingReport(params: { classId?: string; academicYear?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/outstanding${buildQS(params)}`)
    return data
  },

  async getDailyCollectionReport(params: { from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/daily-collection${buildQS(params)}`)
    return data
  },

  async getMonthlyCollectionReport(year: string): Promise<Array<{ month: string; totalInvoiced: string; totalCollected: string; outstanding: string }>> {
    const { data } = await api.get<Array<{ month: string; totalInvoiced: string; totalCollected: string; outstanding: string }>>(`/fees/reports/monthly-collection?year=${year}`)
    return data || []
  },

  async getPaymentMethodSummary(params: { from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/payment-method-summary${buildQS(params)}`)
    return data
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  async getSettings(): Promise<FeeSettings | null> {
    const { data } = await api.get<FeeSettings>('/fees/settings')
    return data || null
  },

  async updateSettings(payload: Partial<Omit<FeeSettings, 'tenantId' | 'lateFeeRule'>>): Promise<boolean> {
    const { error } = await api.put('/fees/settings', payload)
    return !error
  },

  async getLateFeeRule(): Promise<LateFeeRule | null> {
    const { data } = await api.get<LateFeeRule>('/fees/settings/late-fee')
    return data || null
  },

  async updateLateFeeRule(payload: LateFeeRule): Promise<boolean> {
    const { error } = await api.put('/fees/settings/late-fee', payload)
    return !error
  },

  // ── Finance Mapping ───────────────────────────────────────────────────────────
  async getFinanceMapping(): Promise<FinanceMapping | null> {
    const { data } = await api.get<FinanceMapping>('/fees/finance-mapping')
    return data || null
  },

  async updateFinanceMapping(payload: FinanceMapping): Promise<boolean> {
    const { error } = await api.put('/fees/finance-mapping', payload)
    return !error
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────────
  async getAuditLogs(params: { page?: number; limit?: number; action?: string; studentId?: string; invoiceId?: string; from?: string; to?: string } = {}): Promise<Paginated<{ id: string; action: string; actorUserId: string; entityId?: string; studentId?: string; invoiceId?: string; metadata?: Record<string, unknown>; createdAt: string }>> {
    const { data } = await api.get(`/fees/audit-logs${buildQS(params)}`)
    return (data as Paginated<{ id: string; action: string; actorUserId: string; entityId?: string; studentId?: string; invoiceId?: string; metadata?: Record<string, unknown>; createdAt: string }>) || { data: [], total: 0, page: 1, limit: 20 }
  },
}
