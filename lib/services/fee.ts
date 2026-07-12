import { api, toPaginated, apiDownload } from './api-client'

function toArray<T>(raw: unknown): T[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as T[]
  const p = raw as Record<string, unknown>
  if (Array.isArray(p.data)) return p.data as T[]
  return []
}

export type FeeComponentType = 'REGULAR' | 'ADMISSION' | 'EXAM' | 'TRANSPORT' | 'LATE' | 'DISCOUNT' | 'SCHOLARSHIP' | 'OTHER'
export type FeeStructureStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'
export type InvoiceStatus = 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID'
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE_PAYMENT' | 'CHEQUE' | 'MOBILE_WALLET'
export type PaymentStatus = 'COMPLETED' | 'REVERSED' | 'REFUNDED' | 'VOIDED'
// FeeDiscount.type reuses FeeComponentType — confirmed by the create example
// "type": "DISCOUNT", which only fits FeeComponentType's confirmed values, not
// the old (unconfirmed, guessed) DiscountType union this used to be.
export type DiscountMode = 'PERCENTAGE' | 'FIXED'
export type DiscountStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface FeeComponent {
  id: string
  tenantId?: string
  name: string
  description?: string
  defaultAmount: string
  type: FeeComponentType
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
  tenantId?: string
  studentId: string
  studentName?: string
  invoiceId?: string
  studentFeeAssignmentId?: string
  academicYear: string
  type: FeeComponentType
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

// GET /fees/components returns snake_case (default_amount, is_active,
// created_at) while the create/update request bodies are camelCase — an
// asymmetry confirmed from a real response, not a guess.
function normalizeFeeComponent(raw: Record<string, unknown>): FeeComponent {
  return {
    id: raw.id as string,
    tenantId: (raw.tenant_id ?? raw.tenantId) as string,
    name: raw.name as string,
    description: raw.description as string | undefined,
    defaultAmount: (raw.default_amount ?? raw.defaultAmount) as string,
    type: raw.type as FeeComponentType,
    isActive: Boolean(raw.is_active ?? raw.isActive),
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string | undefined,
  }
}

// Same snake_case-response asymmetry confirmed on /fees/components almost
// certainly applies to /fees/structures too (same backend/service) — without
// this, s.classId etc. come back undefined, which silently breaks the save
// flow (formClassId ends up undefined after openEdit, and handleSave's guard
// returns early with no error shown).
function normalizeFeeStructureComponent(raw: Record<string, unknown>): FeeStructureComponent {
  return {
    id: raw.id as string,
    feeStructureId: (raw.fee_structure_id ?? raw.feeStructureId) as string,
    feeComponentId: (raw.fee_component_id ?? raw.feeComponentId) as string | undefined,
    name: raw.name as string,
    amount: raw.amount as string,
    dueDate: (raw.due_date ?? raw.dueDate) as string | undefined,
    isMandatory: Boolean(raw.is_mandatory ?? raw.isMandatory),
    glAccountId: (raw.gl_account_id ?? raw.glAccountId) as string | undefined,
    sortOrder: (raw.sort_order ?? raw.sortOrder) as number,
  }
}

function normalizeFeeStructure(raw: Record<string, unknown>): FeeStructure {
  const rawComponents = raw.components
  return {
    id: raw.id as string,
    tenantId: (raw.tenant_id ?? raw.tenantId) as string,
    classId: (raw.class_id ?? raw.classId) as string,
    className: (raw.class_name ?? raw.className) as string | undefined,
    academicYear: (raw.academic_year ?? raw.academicYear) as string,
    name: raw.name as string,
    notes: raw.notes as string | undefined,
    totalAmount: (raw.total_amount ?? raw.totalAmount) as string,
    status: raw.status as FeeStructureStatus,
    componentCount: (raw.component_count ?? raw.componentCount) as number | undefined,
    components: Array.isArray(rawComponents)
      ? (rawComponents as Record<string, unknown>[]).map(normalizeFeeStructureComponent)
      : undefined,
    activatedAt: (raw.activated_at ?? raw.activatedAt) as string | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string | undefined,
  }
}

function normalizeFeeDiscount(raw: Record<string, unknown>): FeeDiscount {
  return {
    id: raw.id as string,
    tenantId: (raw.tenant_id ?? raw.tenantId) as string | undefined,
    studentId: (raw.student_id ?? raw.studentId) as string,
    studentName: (raw.student_name ?? raw.studentName) as string | undefined,
    invoiceId: (raw.invoice_id ?? raw.invoiceId) as string | undefined,
    studentFeeAssignmentId: (raw.student_fee_assignment_id ?? raw.studentFeeAssignmentId) as string | undefined,
    academicYear: (raw.academic_year ?? raw.academicYear) as string,
    type: raw.type as FeeComponentType,
    discountMode: (raw.discount_mode ?? raw.discountMode) as DiscountMode,
    value: raw.value as string,
    resolvedAmount: (raw.resolved_amount ?? raw.resolvedAmount) as string | undefined,
    reason: raw.reason as string,
    status: raw.status as DiscountStatus,
    approvedByUserId: (raw.approved_by_user_id ?? raw.approvedByUserId) as string | undefined,
    approvedAt: (raw.approved_at ?? raw.approvedAt) as string | undefined,
    rejectionReason: (raw.rejection_reason ?? raw.rejectionReason) as string | undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
  }
}

function normalizeFeeInvoice(raw: Record<string, unknown>): FeeInvoice {
  const rawLines = raw.lines
  return {
    id: raw.id as string,
    tenantId: (raw.tenant_id ?? raw.tenantId) as string,
    invoiceNo: (raw.invoice_no ?? raw.invoiceNo) as string,
    studentId: (raw.student_id ?? raw.studentId) as string,
    studentName: (raw.student_name ?? raw.studentName) as string | undefined,
    classId: (raw.class_id ?? raw.classId) as string,
    className: (raw.class_name ?? raw.className) as string | undefined,
    academicYear: (raw.academic_year ?? raw.academicYear) as string,
    month: raw.month as string | undefined,
    issueDate: (raw.issue_date ?? raw.issueDate) as string,
    dueDate: (raw.due_date ?? raw.dueDate) as string,
    feeStructureId: (raw.fee_structure_id ?? raw.feeStructureId) as string | undefined,
    totalAmount: (raw.total_amount ?? raw.totalAmount) as string,
    discountAmount: (raw.discount_amount ?? raw.discountAmount) as string,
    netAmount: (raw.net_amount ?? raw.netAmount) as string,
    paidAmount: (raw.paid_amount ?? raw.paidAmount) as string,
    balanceAmount: (raw.balance_amount ?? raw.balanceAmount) as string,
    status: raw.status as InvoiceStatus,
    notes: raw.notes as string | undefined,
    lines: Array.isArray(rawLines) ? (rawLines as FeeInvoiceLine[]) : undefined,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string | undefined,
  }
}

function normalizeStudentFeeAssignment(raw: Record<string, unknown>): StudentFeeAssignment {
  return {
    id: raw.id as string,
    tenantId: (raw.tenant_id ?? raw.tenantId) as string,
    studentId: (raw.student_id ?? raw.studentId) as string,
    studentName: (raw.student_name ?? raw.studentName) as string | undefined,
    feeStructureId: (raw.fee_structure_id ?? raw.feeStructureId) as string,
    classId: (raw.class_id ?? raw.classId) as string,
    academicYear: (raw.academic_year ?? raw.academicYear) as string,
    totalFee: (raw.total_fee ?? raw.totalFee) as string,
    discountAmount: (raw.discount_amount ?? raw.discountAmount) as string,
    netAmount: (raw.net_amount ?? raw.netAmount) as string,
    paidAmount: (raw.paid_amount ?? raw.paidAmount) as string,
    balanceAmount: (raw.balance_amount ?? raw.balanceAmount) as string,
    status: raw.status as StudentFeeAssignment['status'],
    createdAt: (raw.created_at ?? raw.createdAt) as string,
  }
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
    const { data, error } = await api.get<unknown>(`/fees/components${buildQS(params)}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizeFeeComponent) }
  },

  // No isActive here — the backend defaults new components to active; let it.
  async createComponent(payload: { name: string; type: FeeComponentType; defaultAmount: string; description?: string; glAccountId?: string }): Promise<{ component: FeeComponent | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/fees/components', payload)
    if (error || !data) return { component: null, error: error || 'Failed to create component' }
    return { component: normalizeFeeComponent(data) }
  },

  async updateComponent(id: string, payload: { name?: string; defaultAmount?: string; description?: string; isActive?: boolean }): Promise<FeeComponent | null> {
    const { data } = await api.patch<Record<string, unknown>>(`/fees/components/${id}`, payload)
    return data ? normalizeFeeComponent(data) : null
  },

  async deleteComponent(id: string): Promise<boolean> {
    const { error } = await api.delete(`/fees/components/${id}`)
    return !error
  },

  // ── Fee Structures ───────────────────────────────────────────────────────────
  async getStructures(params: { page?: number; limit?: number; classId?: string; academicYear?: string; status?: FeeStructureStatus; search?: string } = {}): Promise<Paginated<FeeStructure>> {
    const { data, error } = await api.get<unknown>(`/fees/structures${buildQS(params)}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizeFeeStructure) }
  },

  async getStructureById(id: string): Promise<FeeStructure | null> {
    const { data } = await api.get<Record<string, unknown>>(`/fees/structures/${id}`)
    return data ? normalizeFeeStructure(data) : null
  },

  async createStructure(payload: { classId: string; academicYear: string; name: string; notes?: string; components: Array<{ name: string; amount: string; feeComponentId?: string; dueDate?: string; isMandatory?: boolean; glAccountId?: string; sortOrder?: number }> }): Promise<{ structure: FeeStructure | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/fees/structures', payload)
    if (error || !data) return { structure: null, error: error || 'Failed to create structure' }
    return { structure: normalizeFeeStructure(data) }
  },

  async updateStructure(id: string, payload: { name?: string; academicYear?: string; notes?: string; components?: Array<{ name: string; amount: string; feeComponentId?: string; dueDate?: string; isMandatory?: boolean; glAccountId?: string; sortOrder?: number }> }): Promise<FeeStructure | null> {
    const { data } = await api.patch<Record<string, unknown>>(`/fees/structures/${id}`, payload)
    return data ? normalizeFeeStructure(data) : null
  },

  async deleteStructure(id: string): Promise<boolean> {
    const { error } = await api.delete(`/fees/structures/${id}`)
    return !error
  },

  async activateStructure(id: string): Promise<{ structure: FeeStructure | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>(`/fees/structures/${id}/activate`, {})
    if (error || !data) return { structure: null, error: error || 'Failed to activate' }
    return { structure: normalizeFeeStructure(data) }
  },

  async deactivateStructure(id: string): Promise<FeeStructure | null> {
    const { data } = await api.post<Record<string, unknown>>(`/fees/structures/${id}/deactivate`, {})
    return data ? normalizeFeeStructure(data) : null
  },

  async duplicateStructure(id: string): Promise<FeeStructure | null> {
    const { data } = await api.post<Record<string, unknown>>(`/fees/structures/${id}/duplicate`, {})
    return data ? normalizeFeeStructure(data) : null
  },

  async applyStructureToStudents(id: string, studentIds?: string[]): Promise<{ applied: number; skipped: number } | null> {
    const { data } = await api.post<{ applied: number; skipped: number }>(`/fees/structures/${id}/apply-to-students`, { studentIds })
    return data || null
  },

  async copyStructureToYear(id: string, payload: { academicYear: string; classId?: string; name?: string; notes?: string; componentOverrides?: Array<{ originalComponentId: string; newAmount: string }> }): Promise<{ structure: FeeStructure | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>(`/fees/structures/${id}/copy-to-year`, payload)
    if (error || !data) return { structure: null, error: error || 'Failed to copy' }
    return { structure: normalizeFeeStructure(data) }
  },

  // ── Invoices ─────────────────────────────────────────────────────────────────
  async getInvoices(params: { page?: number; limit?: number; studentId?: string; classId?: string; academicYear?: string; month?: string; status?: InvoiceStatus; from?: string; to?: string; search?: string } = {}): Promise<Paginated<FeeInvoice>> {
    const { data, error } = await api.get<unknown>(`/fees/invoices${buildQS(params)}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizeFeeInvoice) }
  },

  async getInvoiceById(id: string): Promise<FeeInvoice | null> {
    const { data } = await api.get<Record<string, unknown>>(`/fees/invoices/${id}`)
    return data ? normalizeFeeInvoice(data) : null
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
    const { data, error } = await api.get<Paginated<FeePayment>>(`/fees/payments${buildQS(params)}`)
    if (error) throw new Error(error)
    return toPaginated(data)
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
    const { data, error } = await api.get<Paginated<FeeReceipt>>(`/fees/receipts${buildQS(params)}`)
    if (error) throw new Error(error)
    return toPaginated(data)
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
  async getDiscounts(params: { page?: number; limit?: number; studentId?: string; academicYear?: string; type?: FeeComponentType; status?: DiscountStatus } = {}): Promise<Paginated<FeeDiscount>> {
    const { data, error } = await api.get<unknown>(`/fees/discounts${buildQS(params)}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizeFeeDiscount) }
  },

  async getDiscountById(id: string): Promise<FeeDiscount | null> {
    const { data } = await api.get<Record<string, unknown>>(`/fees/discounts/${id}`)
    return data ? normalizeFeeDiscount(data) : null
  },

  async createDiscount(payload: { studentId: string; invoiceId?: string; studentFeeAssignmentId?: string; academicYear: string; type: FeeComponentType; discountMode: DiscountMode; value: string; reason: string }): Promise<{ discount: FeeDiscount | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>('/fees/discounts', payload)
    if (error || !data) return { discount: null, error: error || 'Failed to create discount' }
    return { discount: normalizeFeeDiscount(data) }
  },

  async updateDiscount(id: string, payload: { academicYear?: string; type?: FeeComponentType; discountMode?: DiscountMode; value?: string; reason?: string }): Promise<FeeDiscount | null> {
    const { data } = await api.patch<Record<string, unknown>>(`/fees/discounts/${id}`, payload)
    return data ? normalizeFeeDiscount(data) : null
  },

  async approveDiscount(id: string, notes?: string): Promise<{ discount: FeeDiscount | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>(`/fees/discounts/${id}/approve`, { notes })
    if (error || !data) return { discount: null, error: error || 'Failed to approve' }
    return { discount: normalizeFeeDiscount(data) }
  },

  async rejectDiscount(id: string, reason: string): Promise<{ discount: FeeDiscount | null; error?: string }> {
    const { data, error } = await api.post<Record<string, unknown>>(`/fees/discounts/${id}/reject`, { reason })
    if (error || !data) return { discount: null, error: error || 'Failed to reject' }
    return { discount: normalizeFeeDiscount(data) }
  },

  async deleteDiscount(id: string): Promise<boolean> {
    const { error } = await api.delete(`/fees/discounts/${id}`)
    return !error
  },

  // ── Overdue ──────────────────────────────────────────────────────────────────
  async getOverdueInvoices(params: { page?: number; limit?: number; classId?: string; academicYear?: string } = {}): Promise<Paginated<FeeInvoice>> {
    const { data, error } = await api.get<Paginated<FeeInvoice>>(`/fees/overdue${buildQS(params)}`)
    if (error) throw new Error(error)
    return toPaginated(data)
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
    const { data, error } = await api.get<unknown>(`/fees/student-fees${buildQS(params)}`)
    if (error) throw new Error(error)
    const paginated = toPaginated<Record<string, unknown>>(data)
    return { ...paginated, data: paginated.data.map(normalizeStudentFeeAssignment) }
  },

  async getStudentFeeDetail(studentId: string): Promise<StudentFeeDetail | null> {
    const { data, error } = await api.get<Record<string, unknown>>(`/fees/student-fees/${studentId}/detail`)
    if (error) throw new Error(error)
    if (!data) return null

    const rawStudent = (data.student ?? {}) as Record<string, unknown>
    const rawSummary = (data.summary ?? {}) as Record<string, unknown>
    const rawFeeAssignment = data.fee_assignment ?? data.feeAssignment

    return {
      student: {
        id: rawStudent.id as string,
        fullName: (rawStudent.full_name ?? rawStudent.fullName) as string,
        userCode: (rawStudent.user_code ?? rawStudent.userCode) as string,
        className: (rawStudent.class_name ?? rawStudent.className) as string | undefined,
        academicYear: (rawStudent.academic_year ?? rawStudent.academicYear) as string | undefined,
      },
      feeAssignment: rawFeeAssignment ? normalizeStudentFeeAssignment(rawFeeAssignment as Record<string, unknown>) : undefined,
      invoices: toArray<Record<string, unknown>>(data.invoices).map(normalizeFeeInvoice),
      payments: toArray(data.payments),
      discounts: toArray<Record<string, unknown>>(data.discounts).map(normalizeFeeDiscount),
      summary: {
        totalInvoiced: (rawSummary.total_invoiced ?? rawSummary.totalInvoiced) as string,
        totalPaid: (rawSummary.total_paid ?? rawSummary.totalPaid) as string,
        totalDiscount: (rawSummary.total_discount ?? rawSummary.totalDiscount) as string,
        outstanding: rawSummary.outstanding as string,
      },
    }
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  async getDashboardSummary(): Promise<FeeDashboardSummary | null> {
    const { data, error } = await api.get<FeeDashboardSummary>('/fees/dashboard/summary')
    if (error) throw new Error(error)
    return data || null
  },

  async getCollectionChart(params: { groupBy?: 'month' | 'week' | 'day'; from?: string; to?: string } = {}): Promise<Array<{ period: string; collected: string; invoiced: string }>> {
    const { data, error } = await api.get<unknown>(`/fees/dashboard/collection-chart${buildQS(params)}`)
    if (error) throw new Error(error)
    return toArray<{ period: string; collected: string; invoiced: string }>(data)
  },

  async getClassWiseSummary(): Promise<Array<{ classId: string; className: string; totalInvoiced: string; totalCollected: string; outstanding: string; studentCount: number }>> {
    const { data, error } = await api.get<unknown>('/fees/dashboard/class-wise-summary')
    if (error) throw new Error(error)
    return toArray<{ classId: string; className: string; totalInvoiced: string; totalCollected: string; outstanding: string; studentCount: number }>(data)
  },

  async getOverdueSummary(): Promise<unknown> {
    const { data } = await api.get('/fees/dashboard/overdue-summary')
    return data
  },

  // ── Reports ──────────────────────────────────────────────────────────────────
  async getCollectionSummaryReport(params: { academicYear?: string; classId?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/collection-summary${buildQS(params)}`)
    return data
  },

  // Same endpoint as above, but with format set — the backend returns a real
  // file instead of JSON, so this goes through apiDownload rather than api.get.
  async downloadCollectionSummaryReport(params: { academicYear?: string; classId?: string; from?: string; to?: string; format: 'pdf' | 'csv' | 'xlsx' }): Promise<{ success: boolean; error?: string }> {
    return apiDownload(`/fees/reports/collection-summary${buildQS(params)}`, `collection-summary.${params.format}`)
  },

  async getClassWiseCollectionReport(params: { academicYear?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/class-wise-collection${buildQS(params)}`)
    return data
  },

  async getStudentLedger(studentId: string, params: { academicYear?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/student-ledger/${studentId}${buildQS(params)}`)
    return data
  },

  async getOutstandingReport(params: { academicYear?: string; classId?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/outstanding${buildQS(params)}`)
    return data
  },

  async getDefaultersReport(params: { academicYear?: string; classId?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/defaulters${buildQS(params)}`)
    return data
  },

  async getDailyCollectionReport(params: { academicYear?: string; classId?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/daily-collection${buildQS(params)}`)
    return data
  },

  async getMonthlyCollectionReport(params: { academicYear?: string; classId?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/monthly-collection${buildQS(params)}`)
    return data
  },

  async getDiscountScholarshipSummary(params: { academicYear?: string; classId?: string; from?: string; to?: string } = {}): Promise<unknown> {
    const { data } = await api.get(`/fees/reports/discount-scholarship-summary${buildQS(params)}`)
    return data
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
    return toPaginated(data)
  },
}
