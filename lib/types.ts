// ==================== Core Types ====================

export type UserRole = 
  | 'super_admin'      // System owner - full system access
  | 'tenant_owner'     // Tenant Owner/Society/Trustee - Highest authority within tenant
  | 'tenant_admin'     // Tenant Admin - Operational admin (day-to-day management)
  | 'tenant_accountant' // Tenant Accountant - Finance & accounting focused role
  | 'tenant_cashier'   // Tenant Cashier - Transaction handling role
  | 'tenant_principal' // Tenant Principal - Academic & operational oversight
  | 'teacher'          // Teacher
  | 'hr'               // HR manager
  | 'student'          // Student
  | 'parent'           // Parent/Guardian

export interface User {
  id: string
  tenantId: string | null
  email: string
  name: string
  role: UserRole // Primary role
  roles?: UserRole[] // Additional roles (for multi-role users)
  avatar?: string
  linkedId?: string // Links to parent/student record ID for those roles
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Tenant {
  id: string
  name: string
  logo?: string
  subdomain: string
  isActive: boolean
  features: TenantFeatures
  settings: TenantSettings
  contactInfo: TenantContactInfo
  createdAt: string
  updatedAt: string
}

export interface TenantContactInfo {
  email: string
  phone: string
  whatsapp?: string
  website?: string
  address: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  googleMapsLink?: string
}

export interface TenantFeatures {
  finance_module: boolean
  hr_module: boolean
  inventory_module: boolean
  task_module: boolean
  attendance_module: boolean
  fee_module: boolean
}

export interface TenantSettings {
  academicYear: string
  currency: string
  currencySymbol: string
  timezone: string
  expenseApprovalThreshold: number
  expenseApprovalEnabled: boolean
  requireOwnerApprovalAboveThreshold: boolean
  incomeHeads?: string[]
  expenseHeads?: string[]
  assetCategories?: string[]
  liabilityCategories?: string[]
}

export interface ThresholdHistory {
  id: string
  tenantId: string
  changedBy: string
  changedByName: string
  changedByRole: UserRole
  oldThreshold: number
  newThreshold: number
  reason?: string
  changedAt: string
}

// ==================== Finance Types ====================

export interface GLAccount {
  id: string
  tenantId: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  balance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  tenantId: string
  date: string
  description: string
  debitAccountId: string
  creditAccountId: string
  amount: number
  reference?: string
  createdBy: string
  createdAt: string
}

export interface Budget {
  id: string
  tenantId: string
  name: string
  category: string
  description?: string
  allocatedAmount: number
  spentAmount: number
  fiscalYear: string
  department?: string
  owner: string
  ownerName: string
  status: 'active' | 'paused' | 'exhausted'
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id: string
  tenantId: string
  description: string
  amount: number
  category: string
  vendorName: string
  invoiceNumber?: string
  department?: string
  date: string
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected'
  requiresOwnerApproval: boolean // Based on threshold
  approvalChain: ApprovalStep[]
  requestedBy: string
  requestedByName: string
  requestedByRole: UserRole
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  attachments?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ApprovalStep {
  id: string
  approverRole: UserRole // Role that needs to approve
  approverUserId?: string
  approverName?: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  approvedAt?: string
  comments?: string
  order: number // Order in approval chain
}

// ==================== Fee Types ====================

export interface FeeStructure {
  id: string
  tenantId: string
  className: string
  academicYear: string
  components: FeeComponent[]
  createdAt: string
  updatedAt: string
}

export interface FeeComponent {
  id: string
  name: string
  amount: number
  dueDate: string
}

// Student-specific fee assignment with individual amounts
export interface StudentFee {
  id: string
  tenantId: string
  studentId: string
  studentName: string
  className: string
  rollNumber: string
  academicYear: string
  feeComponents: StudentFeeComponent[]
  totalAmount: number
  paidAmount: number
  discountPercentage: number
  discountAmount: number
  scholarshipPercentage: number
  scholarshipAmount: number
  netAmount: number
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  createdAt: string
  updatedAt: string
}

export interface StudentFeeComponent {
  id: string
  componentName: string
  baseAmount: number
  adjustedAmount: number
  paidAmount: number
  dueDate: string
  status: 'pending' | 'partial' | 'paid' | 'overdue'
}

// Bulk update operations
export interface BulkFeeUpdate {
  studentIds: string[]
  updateType: 'fixed_amount' | 'percentage_increase' | 'percentage_decrease' | 'set_discount' | 'set_scholarship'
  componentId?: string // If targeting specific component, null for all
  value: number
}

export interface Student {
  id: string
  tenantId: string
  name: string
  rollNumber: string
  className: string
  section?: string
  email?: string
  phone?: string
  parentId?: string
  parentName?: string
  parentPhone?: string
  address?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  bloodGroup?: string
  profileImage?: string
  admissionDate: string
  status: 'active' | 'inactive' | 'graduated' | 'transferred'
  // Login credentials
  canLogin: boolean
  userId?: string
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface Parent {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string
  alternatePhone?: string
  occupation?: string
  address: string
  relation: 'father' | 'mother' | 'guardian'
  studentIds: string[]
  isActive: boolean
  // Account details
  canLogin: boolean
  userId?: string
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  tenantId: string
  studentId: string
  studentName: string
  className: string
  feeStructureId: string
  totalAmount: number
  paidAmount: number
  dueDate: string
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  lateFee: number
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  tenantId: string
  invoiceId?: string
  studentFeeId?: string
  amount: number
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'online' | 'cheque'
  reference?: string
  chequeNumber?: string
  bankName?: string
  receivedBy: string
  receivedByName: string
  receiptNumber: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FinancialTransaction {
  id: string
  tenantId: string
  transactionType: 'income' | 'expense' | 'adjustment' | 'transfer'
  category: string
  amount: number
  description: string
  fromAccount?: string
  toAccount?: string
  relatedEntityId?: string // Link to payment, expense, etc.
  relatedEntityType?: 'payment' | 'expense' | 'other'
  reference?: string
  recordedBy: string
  recordedByName: string
  approvedBy?: string
  approvedByName?: string
  status: 'draft' | 'pending' | 'approved' | 'reconciled'
  createdAt: string
  updatedAt: string
}

export interface Receipt {
  id: string
  tenantId: string
  receiptNumber: string
  paymentId: string
  studentName: string
  studentId: string
  className: string
  amount: number
  paymentMethod: string
  reference?: string
  receivedBy: string
  receivedByName: string
  schoolName: string
  schoolLogo?: string
  schoolAddress?: string
  schoolEmail?: string
  schoolPhone?: string
  issuedDate: string
  notes?: string
}

// ==================== Employee Types ====================

export interface Employee {
  id: string
  tenantId: string
  userId: string
  employeeCode: string
  name: string
  email: string
  phone: string
  department: string
  designation: string
  joiningDate: string
  salary: number
  status: 'active' | 'on_leave' | 'terminated'
  leaveBalance: number
  createdAt: string
  updatedAt: string
}

export interface JobOpening {
  id: string
  tenantId: string
  title: string
  department: string
  description: string
  requirements: string[]
  status: 'open' | 'closed' | 'on_hold'
  applicationsCount: number
  createdAt: string
  updatedAt: string
}

export interface JobApplication {
  id: string
  tenantId: string
  jobOpeningId: string
  candidateName: string
  email: string
  phone: string
  resumeUrl?: string
  status: 'applied' | 'screening' | 'interview' | 'selected' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface LeaveRequest {
  id: string
  tenantId: string
  employeeId: string
  employeeName: string
  leaveType: 'sick' | 'casual' | 'earned' | 'maternity' | 'paternity'
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

// ==================== Attendance Types ====================

export interface Attendance {
  id: string
  tenantId: string
  employeeId: string
  employeeName: string
  date: string
  checkIn?: string
  checkOut?: string
  status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave'
  remarks?: string
}

export interface AttendanceSummary {
  employeeId: string
  employeeName: string
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  leaveDays: number
}

// ==================== Inventory Types ====================

export interface Asset {
  id: string
  tenantId: string
  name: string
  category: string
  serialNumber?: string
  purchaseDate: string
  purchasePrice: number
  currentValue: number
  location: string
  assignedTo?: string
  status: 'available' | 'in_use' | 'maintenance' | 'disposed'
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  tenantId: string
  name: string
  category: string
  sku: string
  quantity: number
  reorderLevel: number
  unitPrice: number
  location: string
  supplier?: string
  reorderQuantity: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  lastRestocked: string
  lastMovement?: string
  movementHistory?: InventoryMovement[]
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  movementType: 'purchase' | 'usage' | 'adjustment' | 'transfer'
  quantity: number
  fromLocation?: string
  toLocation?: string
  reason?: string
  reference?: string
  movedBy: string
  movedByName: string
  date: string
}

// ==================== Task Types (Trello-like Kanban) ====================

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'completed'

export interface Task {
  id: string
  tenantId: string
  boardId: string // Link to TaskBoard
  title: string
  description: string
  assigneeIds: string[]
  assigneeNames: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: TaskStatus | string // Allow custom column IDs
  columnOrder: number // For ordering within columns
  dueDate: string
  coverImage?: string
  labels: TaskLabel[]
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
  checklist?: TaskChecklistItem[]
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export interface TaskAttachment {
  id: string
  name: string
  url: string
  type: string
  uploadedAt: string
}

export interface TaskComment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  attachments?: TaskAttachment[]
  createdAt: string
}

export interface TaskChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
}

export interface TaskBoard {
  id: string
  tenantId: string
  name: string
  description?: string
  columns: CustomColumn[]
  visibility: 'private' | 'team' | 'public'
  createdBy: string
  createdByName: string
  teamMembers?: string[] // Team member IDs who have access
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomColumn {
  id: string
  title: string
  color: string
  order: number
  wipLimit?: number // Work in progress limit
}

// ==================== Audit Types ====================

export interface AuditLog {
  id: string
  tenantId: string | null
  userId: string
  userName: string
  action: string
  entity: string
  entityId: string
  details: string
  timestamp: string
}

// ==================== Dashboard Stats ====================

export interface SuperAdminStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalRevenue: number
  recentActivities: AuditLog[]
}

export interface TenantAdminStats {
  totalStudents: number
  totalStaff: number
  totalRevenue: number
  pendingFees: number
  attendanceRate: number
  pendingTasks: number
  recentActivities: AuditLog[]
}

export interface TeacherStats {
  totalClasses: number
  totalStudents: number
  pendingAssignments: number
  todaySchedule: ScheduleItem[]
}

export interface AccountantStats {
  totalCollected: number
  totalPending: number
  pendingInvoices: number
  recentPayments: Payment[]
}

export interface HRStats {
  totalEmployees: number
  pendingLeaves: number
  openPositions: number
  recentHires: Employee[]
}

export interface StudentStats {
  attendancePercentage: number
  pendingFees: number
  upcomingClasses: ScheduleItem[]
}

export interface ScheduleItem {
  id: string
  subject: string
  time: string
  room: string
  teacher?: string
}
