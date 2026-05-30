# School ERP — Tenant Service: Frontend API Guide

Complete reference for frontend developers. Every endpoint, TypeScript interface, error code, and integration pattern in one place.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [TypeScript Interfaces](#typescript-interfaces)
3. [Rate Limits](#rate-limits)
4. [Permission Key Reference](#permission-key-reference)
5. [Error Code Reference](#error-code-reference)
6. [Authentication](#authentication)
7. [Dashboard](#dashboard)
8. [Users](#users)
9. [Access Control](#access-control)
10. [Finance](#finance)
11. [Academics](#academics)
12. [Fees — Components](#fees--components)
13. [Fees — Structures](#fees--structures)
14. [Fees — Invoices](#fees--invoices)
15. [Fees — Payments](#fees--payments)
16. [Fees — Receipts](#fees--receipts)
17. [Fees — Discounts](#fees--discounts)
18. [Fees — Overdue](#fees--overdue)
19. [Fees — Student Detail](#fees--student-detail)
20. [Fees — Dashboard](#fees--dashboard)
21. [Fees — Reports](#fees--reports)
22. [Fees — Settings](#fees--settings)
23. [Fees — Finance Mapping](#fees--finance-mapping)
24. [Fees — Audit Logs](#fees--audit-logs)
25. [Platform Audit Logs](#platform-audit-logs)
26. [Metadata & Dropdowns](#metadata--dropdowns)
27. [Public Endpoints](#public-endpoints)
28. [Frontend Integration Patterns](#frontend-integration-patterns)

---

## Quick Start

```
Base URL (dev):   http://localhost:3000
Base URL (prod):  https://your-hostinger-domain.com
Swagger UI:       <baseUrl>/docs

All protected routes:  Authorization: Bearer <accessToken>
All write routes:      Content-Type: application/json
```

### Standard response envelope

```jsonc
// Paginated list
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}

// Error (all status codes ≥ 400)
{
  "statusCode": 400,
  "code": "MACHINE_READABLE_CODE",
  "message": "Human readable message.",
  "timestamp": "2026-05-26T10:00:00.000Z",
  "path": "/fees/invoices"
}
```

---

## TypeScript Interfaces

### Core types

```typescript
type UUID = string;
type DateString = string;       // ISO 8601: "2026-05-26"
type DateTimeString = string;   // ISO 8601: "2026-05-26T10:00:00.000Z"
type DecimalString = string;    // "5500.00"
type AcademicYear = string;     // "2025-2026"
type Month = string;            // "2026-05"

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

### Auth

```typescript
interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthUser {
  id: UUID;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: UUID;
  tenantSlug: string;
}

type UserRole =
  | 'tenant_owner'
  | 'admin'
  | 'teacher'
  | 'accountant'
  | 'receptionist'
  | 'student'
  | 'parent';
```

### Dashboard Bootstrap

```typescript
interface BootstrapResponse {
  user: {
    id: UUID;
    email: string;
    fullName: string;
    role: UserRole;
    status: 'active' | 'inactive';
    tenantId: UUID;
    tenantSlug: string;
  };
  tenant: {
    id: UUID;
    name: string;
    slug: string;
    logoUrl?: string;
    features: Record<string, boolean>;
  };
  permissions: {
    flat: string[];
    byModule: Record<string, string[]>;
  };
  menu: MenuItem[];
}

interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
}
```

### Academic Class / Section

```typescript
interface AcademicClass {
  id: UUID;
  tenantId: UUID;
  name: string;
  gradeLevel?: number;
  sortOrder: number;
  description?: string;
  isActive: boolean;
  createdAt: DateTimeString;
  updatedAt?: DateTimeString;
}

interface AcademicSection {
  id: UUID;
  tenantId: UUID;
  classId: UUID;
  className: string;
  name: string;
  capacity?: number;
  isActive: boolean;
  createdAt: DateTimeString;
}
```

### Fee Component

```typescript
interface FeeComponent {
  id: UUID;
  tenantId: UUID;
  name: string;
  description?: string;
  defaultAmount: DecimalString;
  componentType: FeeComponentType;
  isActive: boolean;
  createdAt: DateTimeString;
  updatedAt?: DateTimeString;
}

type FeeComponentType =
  | 'TUITION'
  | 'ADMISSION'
  | 'EXAM'
  | 'TRANSPORT'
  | 'LIBRARY'
  | 'SPORTS'
  | 'LAB'
  | 'UNIFORM'
  | 'MISCELLANEOUS';
```

### Fee Structure

```typescript
interface FeeStructure {
  id: UUID;
  tenantId: UUID;
  classId: UUID;
  className?: string;
  academicYear: AcademicYear;
  name: string;
  notes?: string;
  totalAmount: DecimalString;
  status: FeeStructureStatus;
  componentCount?: number;
  components?: FeeStructureComponent[];
  activatedAt?: DateTimeString;
  activatedByUserId?: UUID;
  createdAt: DateTimeString;
  updatedAt?: DateTimeString;
}

type FeeStructureStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

interface FeeStructureComponent {
  id: UUID;
  feeStructureId: UUID;
  feeComponentId?: UUID;
  name: string;
  amount: DecimalString;
  dueDate?: DateString;
  isMandatory: boolean;
  glAccountId?: UUID;
  sortOrder: number;
}

interface CreateFeeStructureRequest {
  classId: UUID;
  academicYear: AcademicYear;   // "2025-2026"
  name: string;
  notes?: string;
  components: Array<{
    name: string;
    amount: string;            // "5000.00"
    feeComponentId?: UUID;
    dueDate?: DateString;
    isMandatory?: boolean;     // default true
    glAccountId?: UUID;
    sortOrder?: number;
  }>;
}

interface UpdateFeeStructureRequest {
  name?: string;
  academicYear?: AcademicYear;
  notes?: string;
  components?: Array<{         // replaces ALL components
    name: string;
    amount: string;
    feeComponentId?: UUID;
    dueDate?: DateString;
    isMandatory?: boolean;
    glAccountId?: UUID;
    sortOrder?: number;
  }>;
}
```

### Fee Invoice

```typescript
interface FeeInvoice {
  id: UUID;
  tenantId: UUID;
  invoiceNo: string;           // "INV-2026-000001"
  studentId: UUID;
  studentName?: string;
  classId: UUID;
  className?: string;
  academicYear: AcademicYear;
  month?: Month;
  issueDate: DateString;
  dueDate: DateString;
  feeStructureId?: UUID;
  studentFeeAssignmentId?: UUID;
  totalAmount: DecimalString;
  discountAmount: DecimalString;
  netAmount: DecimalString;
  paidAmount: DecimalString;
  balanceAmount: DecimalString;
  status: InvoiceStatus;
  notes?: string;
  journalEntryId?: UUID;
  postedToFinanceAt?: DateTimeString;
  cancelledAt?: DateTimeString;
  cancelledByUserId?: UUID;
  cancellationReason?: string;
  lines?: FeeInvoiceLine[];
  createdAt: DateTimeString;
  updatedAt?: DateTimeString;
}

type InvoiceStatus = 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID';

interface FeeInvoiceLine {
  id: UUID;
  invoiceId: UUID;
  componentName: string;
  feeStructureComponentId?: UUID;
  glAccountId?: UUID;
  amount: DecimalString;
  description?: string;
  sortOrder: number;
}

interface CreateFeeInvoiceRequest {
  studentId: UUID;
  classId: UUID;
  academicYear: AcademicYear;
  month?: Month;              // "2026-05"
  issueDate: DateString;
  dueDate: DateString;
  feeStructureId?: UUID;
  studentFeeAssignmentId?: UUID;
  notes?: string;
  lines: Array<{
    componentName: string;
    amount: string;
    feeStructureComponentId?: UUID;
    glAccountId?: UUID;
    description?: string;
  }>;
}

interface GenerateInvoicesRequest {
  classId: UUID;
  feeStructureId: UUID;
  academicYear: AcademicYear;
  issueDate: DateString;
  dueDate: DateString;
  month?: Month;
  studentIds?: UUID[];         // omit to target entire class
}
```

### Fee Payment

```typescript
interface FeePayment {
  id: UUID;
  tenantId: UUID;
  invoiceId: UUID;
  studentId: UUID;
  amount: DecimalString;
  paymentMethod: PaymentMethod;
  paymentDate: DateString;
  referenceNo?: string;
  notes?: string;
  status: PaymentStatus;
  journalEntryId?: UUID;
  postedToFinanceAt?: DateTimeString;
  reversedFromPaymentId?: UUID;
  reversedAt?: DateTimeString;
  reversedByUserId?: UUID;
  reversalReason?: string;
  receivedByUserId?: UUID;
  createdAt: DateTimeString;
}

type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'ONLINE_PAYMENT'
  | 'CHEQUE'
  | 'MOBILE_WALLET';

type PaymentStatus = 'COMPLETED' | 'REVERSED' | 'REFUNDED' | 'VOIDED';

interface CreateFeePaymentRequest {
  invoiceId: UUID;
  amount: string;              // "5500.00"
  paymentMethod: PaymentMethod;
  paymentDate: DateString;
  referenceNo?: string;
  notes?: string;
  receivedByUserId?: UUID;
}

interface CreateFeePaymentResponse {
  payment: FeePayment;
  receipt: FeeReceipt;
}
```

### Fee Receipt

```typescript
interface FeeReceipt {
  id: UUID;
  tenantId: UUID;
  receiptNo: string;           // "RCPT-2026-000001"
  invoiceId: UUID;
  invoiceNo: string;
  paymentId: UUID;
  studentId: UUID;
  amount: DecimalString;
  issuedAt: DateTimeString;
  isVoided: boolean;
  voidedAt?: DateTimeString;
  voidedByUserId?: UUID;
  voidReason?: string;
  createdAt: DateTimeString;
}

interface ReceiptPrintData {
  receiptNo: string;
  issuedAt: DateTimeString;
  tenant: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  student: {
    id: UUID;
    fullName: string;
    userCode: string;
    className?: string;
  };
  invoice: {
    invoiceNo: string;
    academicYear: AcademicYear;
    month?: Month;
    dueDate: DateString;
    netAmount: DecimalString;
    discountAmount: DecimalString;
    balanceAfterPayment: DecimalString;
  };
  payment: {
    amount: DecimalString;
    method: PaymentMethod;
    referenceNo?: string;
    paymentDate: DateString;
  };
  lines: Array<{
    componentName: string;
    amount: DecimalString;
  }>;
}
```

### Fee Discount

```typescript
interface FeeDiscount {
  id: UUID;
  tenantId: UUID;
  studentId: UUID;
  studentName?: string;
  invoiceId?: UUID;
  studentFeeAssignmentId?: UUID;
  academicYear: AcademicYear;
  type: DiscountType;
  discountMode: DiscountMode;
  value: string;               // percentage (0-100) or fixed amount
  resolvedAmount?: DecimalString;
  reason: string;
  status: DiscountStatus;
  approvedByUserId?: UUID;
  approvedAt?: DateTimeString;
  rejectionReason?: string;
  createdAt: DateTimeString;
}

type DiscountType =
  | 'SCHOLARSHIP'
  | 'SIBLING_DISCOUNT'
  | 'STAFF_DISCOUNT'
  | 'NEED_BASED'
  | 'MERIT'
  | 'OTHER';

type DiscountMode = 'PERCENTAGE' | 'FIXED';
type DiscountStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface CreateDiscountRequest {
  studentId: UUID;
  invoiceId?: UUID;
  studentFeeAssignmentId?: UUID;
  academicYear: AcademicYear;
  type: DiscountType;
  discountMode: DiscountMode;
  value: string;
  reason: string;
}
```

### Student Fee Assignment

```typescript
interface StudentFeeAssignment {
  id: UUID;
  tenantId: UUID;
  studentId: UUID;
  studentName?: string;
  feeStructureId: UUID;
  classId: UUID;
  academicYear: AcademicYear;
  totalFee: DecimalString;
  discountAmount: DecimalString;
  netAmount: DecimalString;
  paidAmount: DecimalString;
  balanceAmount: DecimalString;
  status: AssignmentStatus;
  createdAt: DateTimeString;
}

type AssignmentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
```

### Fee Settings

```typescript
interface FeeSettings {
  tenantId: UUID;
  receiptPrefix: string;
  allowPartialPayment: boolean;
  allowAdvancePayment: boolean;
  lateFeeEnabled: boolean;
  financeIntegrationEnabled: boolean;
  defaultReceivableAccountId?: UUID;
  defaultFeeIncomeAccountId?: UUID;
  defaultCashAccountId?: UUID;
  lateFeeRule?: LateFeeRule;
}

interface LateFeeRule {
  enabled: boolean;
  chargeType: 'PERCENTAGE' | 'FIXED';
  chargeValue: string;
  gracePeriodDays: number;
  compoundingEnabled: boolean;
}
```

---

## Rate Limits

| Endpoint pattern | Limit | Window |
|---|---|---|
| `POST /fees/payments` | 20 requests | 1 minute |
| `POST /fees/payments/:id/reverse` | 5 requests | 1 minute |
| `POST /fees/payments/:id/refund` | 5 requests | 1 minute |
| `POST /fees/discounts` | 20 requests | 1 minute |
| `POST /fees/discounts/:id/approve` | 5 requests | 1 minute |
| `POST /fees/discounts/:id/reject` | 5 requests | 1 minute |
| `POST /fees/receipts/:id/void` | 5 requests | 1 minute |
| All other endpoints | 100 requests | 1 minute |

Rate limit response (`429 Too Many Requests`):
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Permission Key Reference

> Call `GET /dashboard/bootstrap` → `permissions.flat` to get the calling user's permission list.

| Module | Permission Key | Grants Access To |
|---|---|---|
| **Users** | `users.user.read` | List / view users |
| | `users.user.create` | Invite new users |
| | `users.user.update` | Edit user profiles |
| | `users.user.deactivate` | Deactivate accounts |
| | `users.user.reactivate` | Reactivate accounts |
| | `users.user.delete` | Soft-delete users |
| | `users.user.reset_password` | Send reset links |
| | `users.dropdown.read` | User selector lists |
| **Permissions** | `permissions.group.read` | View groups + catalog |
| | `permissions.group.create` | Create custom groups |
| | `permissions.group.update` | Edit group permissions |
| | `permissions.assign` | Assign users to groups |
| | `permissions.direct_assign` | Direct user overrides |
| **Academics** | `academics.class.read` | List classes |
| | `academics.class.create` | Create classes |
| | `academics.class.update` | Edit classes |
| | `academics.class.delete` | Delete classes |
| | `academics.section.read` | List sections |
| | `academics.section.create` | Create sections |
| | `academics.section.update` | Edit sections |
| | `academics.section.delete` | Delete sections |
| **Finance** | `finance.gl_account.read` | View GL accounts |
| | `finance.gl_account.create` | Create GL accounts |
| | `finance.gl_account.update` | Edit GL accounts |
| | `finance.transaction.read` | View transactions |
| | `finance.transaction.create` | Record transactions |
| | `finance.transaction.approve` | Approve expenses |
| | `finance.transaction.reject` | Reject expenses |
| | `finance.dashboard.read` | Finance dashboard |
| | `finance.report.read` | Finance reports |
| | `finance.settings.read` | View finance settings |
| | `finance.settings.update` | Change finance settings |
| | `finance.budget.read` | View budgets |
| | `finance.budget.create` | Create budgets |
| **Fees** | `fees.component.read` | View fee components |
| | `fees.component.create` | Create components |
| | `fees.component.update` | Edit components |
| | `fees.component.delete` | Delete components |
| | `fees.structure.read` | View fee structures |
| | `fees.structure.create` | Create / copy structures |
| | `fees.structure.update` | Edit / activate structures |
| | `fees.structure.delete` | Delete DRAFT structures |
| | `fees.invoice.read` | View invoices |
| | `fees.invoice.create` | Create / generate invoices |
| | `fees.invoice.update` | Cancel / post invoices |
| | `fees.payment.read` | View payments |
| | `fees.payment.create` | Record payments |
| | `fees.payment.reverse` | Reverse payments |
| | `fees.payment.refund` | Issue refunds |
| | `fees.receipt.read` | View / print receipts |
| | `fees.receipt.void` | Void receipts |
| | `fees.discount.read` | View discounts |
| | `fees.discount.create` | Submit discount requests |
| | `fees.discount.approve` | Approve discounts |
| | `fees.discount.reject` | Reject discounts |
| | `fees.discount.update` | Delete pending discounts |
| | `fees.report.read` | Fee reports + dashboard |
| | `fees.settings.read` | View fee settings |
| | `fees.settings.update` | Change fee settings |
| | `fees.audit.read` | View fee audit log |
| **Audit** | `audit.read` | Platform audit logs |

---

## Error Code Reference

### Auth errors

| Code | Status | Meaning |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `USER_INACTIVE` | 403 | Account has been deactivated |
| `TENANT_NOT_FOUND` | 404 | Unknown tenantSlug |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token past its TTL |
| `REFRESH_TOKEN_REVOKED` | 401 | Token was explicitly revoked on logout |
| `AUTH_TOKEN_INVALID` | 401 | Malformed / expired access token |
| `INVALID_INVITATION_TOKEN` | 400 | set-password token bad or expired |
| `PASSWORD_TOO_WEAK` | 400 | Password fails strength policy |

### User errors

| Code | Status | Meaning |
|---|---|---|
| `USER_NOT_FOUND` | 404 | No user with that ID in this tenant |
| `USER_EMAIL_ALREADY_EXISTS` | 409 | Email taken by another user |
| `ROLE_FORBIDDEN` | 403 | Caller cannot assign that role |

### Academics errors

| Code | Status | Meaning |
|---|---|---|
| `CLASS_NOT_FOUND` | 404 | Class ID not found |
| `CLASS_NAME_CONFLICT` | 409 | Class name already exists |
| `SECTION_NOT_FOUND` | 404 | Section ID not found |
| `SECTION_NAME_CONFLICT` | 409 | Section name exists in this class |

### Fee — Structure errors

| Code | Status | Meaning |
|---|---|---|
| `FEE_STRUCTURE_NOT_FOUND` | 404 | Structure ID not found |
| `FEE_STRUCTURE_CONFLICT` | 409 | Same name + class + year already exists |
| `FEE_STRUCTURE_YEAR_CONFLICT` | 409 | Copy-to-year target already exists |
| `FEE_STRUCTURE_LOCKED` | 400 | Cannot edit/delete an ACTIVE structure |
| `FEE_STRUCTURE_EMPTY` | 400 | Cannot activate structure with no components |
| `FEE_STRUCTURE_NOT_ACTIVE` | 400 | Must activate before applying to students |

### Fee — Invoice errors

| Code | Status | Meaning |
|---|---|---|
| `INVOICE_NOT_FOUND` | 404 | Invoice ID not found |
| `INVOICE_STATUS_INVALID` | 400 | Operation not allowed in current status |
| `INVOICE_CANCEL_INVALID` | 400 | Already PAID/CANCELLED/VOID |
| `INVOICE_ALREADY_POSTED` | 400 | Already has a GL journal entry |
| `INVOICE_AMOUNT_INVALID` | 400 | Linked invoice has zero/invalid net amount |

### Fee — Payment errors

| Code | Status | Meaning |
|---|---|---|
| `PAYMENT_NOT_FOUND` | 404 | Payment ID not found |
| `PAYMENT_EXCEEDS_BALANCE` | 400 | Amount > invoice balance |
| `PARTIAL_PAYMENT_NOT_ALLOWED` | 400 | Settings: partial payments disabled |
| `ADVANCE_PAYMENT_NOT_ALLOWED` | 400 | Settings: advance payments disabled |
| `PAYMENT_ALREADY_REVERSED` | 400 | Payment already reversed/refunded |
| `PAYMENT_REVERSAL_INVALID` | 400 | Cannot reverse a non-COMPLETED payment |

### Fee — Receipt errors

| Code | Status | Meaning |
|---|---|---|
| `RECEIPT_NOT_FOUND` | 404 | Receipt ID not found |
| `RECEIPT_ALREADY_VOIDED` | 400 | Receipt was already voided |

### Fee — Discount errors

| Code | Status | Meaning |
|---|---|---|
| `DISCOUNT_NOT_FOUND` | 404 | Discount ID not found |
| `DISCOUNT_STATUS_INVALID` | 400 | Can only approve/reject PENDING discounts |
| `DISCOUNT_APPROVED` | 400 | Cannot delete an approved discount |
| `DISCOUNT_PERCENTAGE_INVALID` | 400 | Percentage must be between 0.01 and 100 |
| `DISCOUNT_AMOUNT_INVALID` | 400 | Fixed amount must be positive |
| `DISCOUNT_EXCEEDS_INVOICE` | 400 | Fixed discount exceeds invoice net amount |

---

## Authentication

### POST `/auth/login`

**No auth required.**

```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string;  // e.g. "md-grammar"
}

// Response 200
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
```

Error codes: `INVALID_CREDENTIALS` (401) · `USER_INACTIVE` (403) · `TENANT_NOT_FOUND` (404)

---

### POST `/auth/refresh`

**No auth required.**

```typescript
// Request
{ refreshToken: string }

// Response 200
{ accessToken: string; refreshToken: string }
```

Error codes: `REFRESH_TOKEN_EXPIRED` (401) · `REFRESH_TOKEN_REVOKED` (401)

---

### POST `/auth/logout`

**No auth required.**

```typescript
{ refreshToken: string }
// Response 200: { message: "Logged out successfully." }
```

---

### GET `/auth/user`

**Auth required.** Returns the currently authenticated user with resolved permissions.

```typescript
// Response 200
interface CurrentUserResponse extends AuthUser {
  phone?: string;
  status: 'active' | 'inactive';
  permissions: {
    flat: string[];
    byModule: Record<string, string[]>;
  };
}
```

---

### PATCH `/auth/me`

**Auth required.** Update own profile.

```typescript
// Request (all optional)
interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
}
```

---

### POST `/auth/change-password`

**Auth required.**

```typescript
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;   // min 8 chars, 1 uppercase, 1 number, 1 special
}
// Response 200: { message: "Password changed successfully." }
```

Error codes: `INVALID_CREDENTIALS` (400) · `PASSWORD_TOO_WEAK` (400)

---

### POST `/auth/forgot-password`

**No auth required.** Returns `setupUrl` in dev (no email service wired in production yet).

```typescript
interface ForgotPasswordRequest {
  email: string;
  tenantSlug: string;
}
// Response 200: { message: string; setupUrl?: string }
```

---

### POST `/auth/set-password`

**No auth required.** Used for invitation links and password resets.

```typescript
interface SetPasswordRequest {
  token: string;
  password: string;
}
// Response 200: { message: "Password set successfully." }
```

Error codes: `INVALID_INVITATION_TOKEN` (400) · `PASSWORD_TOO_WEAK` (400)

---

## Dashboard

### GET `/dashboard/bootstrap`

**Auth required.** Call once after login — returns everything the shell needs to initialise.

```typescript
// Response 200: BootstrapResponse (see TypeScript Interfaces section)
```

### GET `/dashboard/summary`

**Auth required.** Quick KPI tiles.

```typescript
// Response 200
interface DashboardSummary {
  totalUsers: number;
  activeUsers: number;
  finance: {
    totalIncome: DecimalString;
    totalExpense: DecimalString;
    netBalance: DecimalString;
  };
}
```

---

## Users

### GET `/users`

**Permission:** `users.user.read`

Query params: `page` · `limit` · `role` · `status` (active/inactive) · `search`

```typescript
// Response 200: Paginated<UserListItem>
interface UserListItem {
  id: UUID;
  userCode: string;        // "USR-MDG-TCH-001"
  fullName: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  isActive: boolean;
  phone?: string;
  createdAt: DateTimeString;
}
```

---

### POST `/users`

**Permission:** `users.user.create`

```typescript
interface CreateUserRequest {
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
}

// Response 201
interface CreateUserResponse {
  user: UserListItem;
  setupUrl: string;   // send this link to the user to set their password
}
```

Error codes: `USER_EMAIL_ALREADY_EXISTS` (409) · `ROLE_FORBIDDEN` (403)

---

### GET `/users/:id`

**Permission:** `users.user.read`

```typescript
// Response 200: UserListItem (full detail)
```

---

### PATCH `/users/:id`

**Permission:** `users.user.update`

```typescript
interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
}
```

---

### PATCH `/users/:id/deactivate` · `PATCH /users/:id/reactivate`

**Permission:** `users.user.deactivate` / `users.user.reactivate`

```json
// Response 200
{ "message": "User deactivated." }
```

---

### DELETE `/users/:id`

**Permission:** `users.user.delete` — soft-delete only (sets `isDeleted = true`).

---

### POST `/users/:id/reset-password`

**Permission:** `users.user.reset_password`

```typescript
// Response 200
{ setupUrl: string }
```

---

### GET `/users/dropdowns/staff` · `/teachers` · `/students` · `/parents`

**Permission:** `users.dropdown.read`

```typescript
// Response 200
interface UserDropdownItem {
  id: UUID;
  fullName: string;
  userCode: string;
}
```

---

## Access Control

### GET `/access-control/permissions`

**Permission:** `permissions.group.read` — full permission catalog grouped by module.

### GET `/access-control/groups`

**Permission:** `permissions.group.read`

```typescript
interface PermissionGroup {
  id: UUID;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  isProtected: boolean;
  permissionCount: number;
}
// Response 200: PermissionGroup[]
```

### POST `/access-control/groups`

**Permission:** `permissions.group.create`

```typescript
interface CreateGroupRequest {
  name: string;
  description?: string;
}
```

### POST `/access-control/groups/:id/clone`

**Permission:** `permissions.group.create` — clones a system group into an editable copy.

```typescript
{ name: string }
```

### POST `/access-control/groups/:id/permissions`

**Permission:** `permissions.group.update`

```typescript
interface AssignPermissionRequest {
  permissionId: UUID;
  effect: 'ALLOW' | 'DENY';
}
```

### POST `/access-control/users/:userId/groups`

**Permission:** `permissions.assign`

```typescript
{ permissionGroupId: UUID }
```

### GET `/access-control/users/:userId/permissions/resolved`

**Permission:** `permissions.group.read` — final effective permissions after merging all groups + direct overrides.

### POST `/access-control/users/:userId/permissions`

**Permission:** `permissions.direct_assign` — grant or deny a single permission directly on a user.

```typescript
interface DirectPermissionRequest {
  permissionId: UUID;
  effect: 'ALLOW' | 'DENY';
}
```

---

## Finance

> Finance routes require the `finance` feature flag to be enabled for the tenant (`tenant.features.finance === true`).

### POST `/finance/bootstrap/default-gl`

**Permission:** `finance.gl_account.create` — call once per tenant to seed the default chart of accounts.

```typescript
// Response 201
{ created: number; accounts: GlAccount[] }
```

---

### GET `/finance/gl-accounts`

**Permission:** `finance.gl_account.read`

Query params: `type` (ASSET/LIABILITY/INCOME/EXPENSE/EQUITY) · `isActive` · `search`

```typescript
interface GlAccount {
  id: UUID;
  code: string;          // "1001"
  name: string;          // "Cash-in-Hand"
  type: GlAccountType;
  normalSide: 'DEBIT' | 'CREDIT';
  balance: DecimalString;
  isActive: boolean;
}

type GlAccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
```

---

### POST `/finance/gl-accounts`

**Permission:** `finance.gl_account.create`

```typescript
interface CreateGlAccountRequest {
  code: string;
  name: string;
  type: GlAccountType;
  normalSide: 'DEBIT' | 'CREDIT';
  description?: string;
}
```

---

### GET `/finance/transactions`

**Permission:** `finance.transaction.read`

Query params: `page` · `limit` · `type` (INCOME/EXPENSE/TRANSFER) · `status` (POSTED/PENDING_APPROVAL/REJECTED/REVERSED) · `from` (date) · `to` (date) · `search`

```typescript
interface FinanceTransaction {
  id: UUID;
  reference: string;     // "INC-000015"
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: DecimalString;
  description: string;
  status: string;
  date: DateString;
  categoryAccount?: { code: string; name: string };
  fromAccount?: { code: string; name: string };
  toAccount?: { code: string; name: string };
  paymentAccount?: { code: string; name: string };
}
```

---

### POST `/finance/transactions`

**Permission:** `finance.transaction.create`

```typescript
// INCOME
interface CreateIncomeRequest {
  type: 'INCOME';
  amount: string;
  description: string;
  date: DateString;
  categoryAccountId: UUID;    // INCOME-type GL account
  paymentAccountId: UUID;      // ASSET-type GL account (cash / bank)
}

// EXPENSE
interface CreateExpenseRequest {
  type: 'EXPENSE';
  amount: string;
  description: string;
  date: DateString;
  categoryAccountId: UUID;    // EXPENSE-type GL account
  paymentAccountId: UUID;
}

// TRANSFER
interface CreateTransferRequest {
  type: 'TRANSFER';
  amount: string;
  description: string;
  date: DateString;
  fromAccountId: UUID;
  toAccountId: UUID;
}
```

Response: `201 POSTED` immediately if below approval threshold, or `202 PENDING_APPROVAL` if above.

---

### GET `/finance/expenses/pending`

**Permission:** `finance.transaction.read`

### POST `/finance/expenses/:id/approve`

**Permission:** `finance.transaction.approve`

```typescript
{ notes?: string }
```

### POST `/finance/expenses/:id/reject`

**Permission:** `finance.transaction.reject`

```typescript
{ reason: string }
```

---

### GET `/finance/overview`

**Permission:** `finance.dashboard.read`

```typescript
interface FinanceOverview {
  totalIncome: DecimalString;
  totalExpense: DecimalString;
  netBalance: DecimalString;
  cashBalance: DecimalString;
  pendingApprovalCount: number;
}
```

---

### GET `/finance/reports/trial-balance`

**Permission:** `finance.report.read`  
Query params: `asOf` (DateString)

### GET `/finance/reports/ledger`

**Permission:** `finance.report.read`  
Query params: `accountId` (UUID) · `from` (DateString) · `to` (DateString)

---

### GET `/finance/settings`

**Permission:** `finance.settings.read`

### PUT `/finance/settings`

**Permission:** `finance.settings.update`

```typescript
{ key: string; value: string }
```

---

### GET `/finance/expense-approval`

**Permission:** `finance.expense_approval.read`

```typescript
{ enabled: boolean; threshold: DecimalString }
```

### PUT `/finance/expense-approval`

**Permission:** `finance.expense_approval.update`

```typescript
{ enabled: boolean; threshold: string }
```

---

### GET `/finance/budgets`

**Permission:** `finance.budget.read`

### POST `/finance/budgets`

**Permission:** `finance.budget.create`

```typescript
interface CreateBudgetRequest {
  name: string;
  glAccountId: UUID;
  allocatedAmount: string;
  startDate: DateString;
  endDate: DateString;
}
```

---

## Academics

### GET `/academics/classes`

**Permission:** `academics.class.read`

Query params: `page` · `limit` · `search`

```typescript
// Response 200: Paginated<AcademicClass>
```

---

### POST `/academics/classes`

**Permission:** `academics.class.create`

```typescript
interface CreateClassRequest {
  name: string;
  gradeLevel?: number;
  description?: string;
  sortOrder?: number;
}
// Response 201: AcademicClass
```

Error codes: `CLASS_NAME_CONFLICT` (409)

---

### GET `/academics/classes/:id`

**Permission:** `academics.class.read`

```typescript
// Response 200: AcademicClass
```

---

### PATCH `/academics/classes/:id`

**Permission:** `academics.class.update`

```typescript
interface UpdateClassRequest {
  name?: string;
  gradeLevel?: number;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}
```

Error codes: `CLASS_NOT_FOUND` (404) · `CLASS_NAME_CONFLICT` (409)

---

### DELETE `/academics/classes/:id`

**Permission:** `academics.class.delete`  
Soft-delete only. Returns `204 No Content`.

---

### GET `/academics/sections`

**Permission:** `academics.section.read`

Query params: `classId` (UUID) · `page` · `limit`

```typescript
// Response 200: Paginated<AcademicSection>
```

---

### POST `/academics/sections`

**Permission:** `academics.section.create`

```typescript
interface CreateSectionRequest {
  classId: UUID;
  name: string;            // "A", "B", "Blue"
  capacity?: number;
}
// Response 201: AcademicSection
```

Error codes: `CLASS_NOT_FOUND` (404) · `SECTION_NAME_CONFLICT` (409)

---

### GET `/academics/sections/:id`

**Permission:** `academics.section.read`

---

### PATCH `/academics/sections/:id`

**Permission:** `academics.section.update`

```typescript
interface UpdateSectionRequest {
  name?: string;
  capacity?: number;
  isActive?: boolean;
}
```

---

### DELETE `/academics/sections/:id`

**Permission:** `academics.section.delete`

---

## Fees — Components

> Fee components are the master catalogue of fee line items (Tuition, Exam, Transport, …).

### GET `/fees/components`

**Permission:** `fees.component.read`

Query params: `page` · `limit` · `search` · `isActive`

```typescript
// Response 200: Paginated<FeeComponent>
```

---

### POST `/fees/components`

**Permission:** `fees.component.create`

```typescript
interface CreateFeeComponentRequest {
  name: string;
  defaultAmount: string;
  description?: string;
  componentType?: FeeComponentType;
  glAccountId?: UUID;
}
// Response 201: FeeComponent
```

---

### GET `/fees/components/:id`

**Permission:** `fees.component.read`

---

### PATCH `/fees/components/:id`

**Permission:** `fees.component.update`

```typescript
interface UpdateFeeComponentRequest {
  name?: string;
  defaultAmount?: string;
  description?: string;
  isActive?: boolean;
  glAccountId?: UUID;
}
```

---

### DELETE `/fees/components/:id`

**Permission:** `fees.component.delete`  
Returns `204 No Content`.

---

## Fees — Structures

> A fee structure groups components for one class + academic year. Status flow: `DRAFT → ACTIVE → INACTIVE`.

### GET `/fees/structures`

**Permission:** `fees.structure.read`

Query params: `page` · `limit` · `classId` · `academicYear` (e.g. `2025-2026`) · `status` (DRAFT/ACTIVE/INACTIVE) · `search`

```typescript
// Response 200: Paginated<FeeStructure>
// (components not populated in list; use GET /fees/structures/:id for components)
```

---

### POST `/fees/structures`

**Permission:** `fees.structure.create`

```typescript
// Request: CreateFeeStructureRequest (see TypeScript Interfaces section)
// Response 201: FeeStructure (with components)
```

Error codes: `FEE_STRUCTURE_CONFLICT` (409)

---

### GET `/fees/structures/:id`

**Permission:** `fees.structure.read`

```typescript
// Response 200: FeeStructure (with components array populated)
```

---

### PATCH `/fees/structures/:id`

**Permission:** `fees.structure.update`  
Only DRAFT structures can be edited. Providing `components` replaces **all** existing components.

```typescript
// Request: UpdateFeeStructureRequest (see TypeScript Interfaces section)
// Response 200: FeeStructure
```

Error codes: `FEE_STRUCTURE_NOT_FOUND` (404) · `FEE_STRUCTURE_LOCKED` (400)

---

### DELETE `/fees/structures/:id`

**Permission:** `fees.structure.delete`  
Only DRAFT or INACTIVE structures can be deleted. Returns `204 No Content`.

Error codes: `FEE_STRUCTURE_LOCKED` (400)

---

### POST `/fees/structures/:id/activate`

**Permission:** `fees.structure.update`  
Moves status from `DRAFT → ACTIVE`. Requires at least one component.

```typescript
// Response 200: FeeStructure
```

Error codes: `FEE_STRUCTURE_EMPTY` (400)

---

### POST `/fees/structures/:id/deactivate`

**Permission:** `fees.structure.update`  
Moves status to `INACTIVE`. An ACTIVE structure cannot be edited — deactivate first.

```typescript
// Response 200: FeeStructure
```

---

### POST `/fees/structures/:id/duplicate`

**Permission:** `fees.structure.create`  
Creates a DRAFT copy named `"<original name> (Copy)"` for the same class + year.

```typescript
// Response 201: FeeStructure
```

---

### POST `/fees/structures/:id/apply-to-students`

**Permission:** `fees.structure.update`  
Generates `StudentFeeAssignment` records. Structure must be `ACTIVE`. Skips students already assigned.

```typescript
interface ApplyToStudentsRequest {
  studentIds?: UUID[];   // omit to apply to ALL active students
}

// Response 200
interface ApplyResult {
  applied: number;
  skipped: number;
}
```

Error codes: `FEE_STRUCTURE_NOT_ACTIVE` (400)

---

### POST `/fees/structures/:id/copy-to-year`

**Permission:** `fees.structure.create`  
Copies a structure to a new academic year. Component amounts can be individually overridden. Creates as `DRAFT`.

```typescript
interface CopyToYearRequest {
  academicYear: AcademicYear;  // target year, e.g. "2026-2027"
  classId?: UUID;              // defaults to source classId
  name?: string;               // defaults to "<name> (2026-2027)"
  notes?: string;
  componentOverrides?: Array<{
    originalComponentId: UUID;  // component ID from the source structure
    newAmount: string;          // new amount for the copied structure
  }>;
}

// Response 201: FeeStructure
```

Error codes: `FEE_STRUCTURE_YEAR_CONFLICT` (409)

---

## Fees — Invoices

### GET `/fees/invoices`

**Permission:** `fees.invoice.read`

Query params: `page` · `limit` · `studentId` · `classId` · `academicYear` · `month` · `status` (ISSUED/PARTIAL/PAID/OVERDUE/CANCELLED/VOID) · `from` (dueDate ≥) · `to` (dueDate ≤) · `search` (invoice number or student name)

```typescript
// Response 200: Paginated<FeeInvoice>
// (lines not populated in list; use GET /fees/invoices/:id for lines)
```

---

### POST `/fees/invoices`

**Permission:** `fees.invoice.create` — create a single invoice manually.

```typescript
// Request: CreateFeeInvoiceRequest (see TypeScript Interfaces section)
// Response 201: FeeInvoice
```

---

### POST `/fees/invoices/generate`

**Permission:** `fees.invoice.create` — bulk-generate invoices for a class from a fee structure. Skips students who already have an invoice for the same structure + month.

```typescript
// Request: GenerateInvoicesRequest (see TypeScript Interfaces section)

// Response 201
interface GenerateResult {
  generated: number;
  skipped: number;
}
```

Error codes: `FEE_STRUCTURE_EMPTY` (400)

---

### GET `/fees/invoices/:id`

**Permission:** `fees.invoice.read`

```typescript
// Response 200: FeeInvoice (with lines array populated)
```

---

### POST `/fees/invoices/:id/cancel`

**Permission:** `fees.invoice.update`  
Cannot cancel PAID, CANCELLED, or VOID invoices.

```typescript
interface CancelInvoiceRequest {
  reason?: string;
}
// Response 200: FeeInvoice
```

Error codes: `INVOICE_CANCEL_INVALID` (400)

---

### POST `/fees/invoices/:id/recalculate`

**Permission:** `fees.invoice.update`  
Recalculates `paidAmount` and `balanceAmount` from actual COMPLETED payment records. Updates status to PARTIAL or PAID accordingly.

```typescript
// No request body required
// Response 204 No Content
```

---

### POST `/fees/invoices/:id/post-to-finance`

**Permission:** `fees.invoice.update`  
Posts invoice to GL: **Dr Accounts Receivable / Cr Fee Income**. Requires `financeIntegrationEnabled = true` in fee settings. Can only be posted once.

```typescript
// Response 200: FeeInvoice (with journalEntryId populated)
```

Error codes: `INVOICE_ALREADY_POSTED` (400)

---

### POST `/fees/invoices/:id/mark-overdue`

**Permission:** `fees.invoice.update`  
Marks ISSUED or PARTIAL invoices as OVERDUE. Typically called by a scheduled job; also available manually.

```typescript
// Response 200: FeeInvoice
```

---

## Fees — Payments

### GET `/fees/payments`

**Permission:** `fees.payment.read`

Query params: `page` · `limit` · `studentId` · `invoiceId` · `paymentMethod` · `status` · `from` (paymentDate ≥) · `to` (paymentDate ≤)

```typescript
// Response 200: Paginated<FeePayment>
```

---

### GET `/fees/payments/:id`

**Permission:** `fees.payment.read`

```typescript
// Response 200: FeePayment
```

---

### POST `/fees/payments`

**Permission:** `fees.payment.create`  
**Rate limit:** 20 / minute.  
Records the payment, auto-generates a receipt, and atomically updates the invoice's `paidAmount` and `status`. If `financeIntegrationEnabled = true`, also posts to GL (**Dr Cash / Cr Accounts Receivable**).

```typescript
// Request: CreateFeePaymentRequest (see TypeScript Interfaces section)

// Response 201: CreateFeePaymentResponse
// { payment: FeePayment; receipt: FeeReceipt }
```

Error codes:
- `INVOICE_NOT_FOUND` (404)
- `INVOICE_STATUS_INVALID` (400) — invoice is PAID/CANCELLED/VOID
- `PAYMENT_EXCEEDS_BALANCE` (400)
- `PARTIAL_PAYMENT_NOT_ALLOWED` (400)
- `ADVANCE_PAYMENT_NOT_ALLOWED` (400)

---

### POST `/fees/payments/:id/reverse`

**Permission:** `fees.payment.reverse`  
**Rate limit:** 5 / minute.  
Reverses a COMPLETED payment, creating a reversal record and reducing the invoice `paidAmount`. If GL-posted, creates an offsetting journal entry.

```typescript
interface ReversePaymentRequest {
  reason: string;
}
// Response 200: FeePayment (original, with status = 'REVERSED')
```

Error codes: `PAYMENT_ALREADY_REVERSED` (400)

---

### POST `/fees/payments/:id/refund`

**Permission:** `fees.payment.refund`  
**Rate limit:** 5 / minute.  
Alias for reverse — use when a refund is being issued to the student.

```typescript
{ reason: string }
// Response 200: FeePayment
```

---

## Fees — Receipts

### GET `/fees/receipts`

**Permission:** `fees.receipt.read`

Query params: `page` · `limit` · `studentId` · `invoiceId` · `paymentId` · `isVoided` (boolean)

```typescript
// Response 200: Paginated<FeeReceipt>
```

---

### GET `/fees/receipts/:id`

**Permission:** `fees.receipt.read`

```typescript
// Response 200: FeeReceipt
```

---

### GET `/fees/receipts/:id/print`

**Permission:** `fees.receipt.read`  
Returns fully formatted receipt data ready for PDF/print rendering. All strings are formatted for display.

```typescript
// Response 200: ReceiptPrintData (see TypeScript Interfaces section)
```

---

### POST `/fees/receipts/:id/void`

**Permission:** `fees.receipt.void`  
**Rate limit:** 5 / minute.  
Voids a receipt (does not reverse the payment — use `/fees/payments/:id/reverse` for that).

```typescript
interface VoidReceiptRequest {
  reason: string;
}
// Response 200: FeeReceipt
```

Error codes: `RECEIPT_ALREADY_VOIDED` (400)

---

## Fees — Discounts

### GET `/fees/discounts`

**Permission:** `fees.discount.read`

Query params: `page` · `limit` · `studentId` · `academicYear` · `type` · `status` (PENDING/APPROVED/REJECTED)

```typescript
// Response 200: Paginated<FeeDiscount>
```

---

### POST `/fees/discounts`

**Permission:** `fees.discount.create`  
**Rate limit:** 20 / minute.  
Creates a discount in `PENDING` status. Must be approved before it takes effect.

```typescript
// Request: CreateDiscountRequest (see TypeScript Interfaces section)
// Response 201: FeeDiscount
```

---

### GET `/fees/discounts/:id`

**Permission:** `fees.discount.read`

---

### POST `/fees/discounts/:id/approve`

**Permission:** `fees.discount.approve`  
**Rate limit:** 5 / minute.  
Approves a PENDING discount. If linked to an invoice, immediately reduces `netAmount` and `balanceAmount` on that invoice.

```typescript
interface ApproveDiscountRequest {
  notes?: string;
}
// Response 200: FeeDiscount (with resolvedAmount populated)
```

Error codes: `DISCOUNT_STATUS_INVALID` (400) · `INVOICE_NOT_FOUND` (404) · `DISCOUNT_EXCEEDS_INVOICE` (400)

---

### POST `/fees/discounts/:id/reject`

**Permission:** `fees.discount.reject`  
**Rate limit:** 5 / minute.

```typescript
interface RejectDiscountRequest {
  reason: string;
}
// Response 200: FeeDiscount
```

---

### DELETE `/fees/discounts/:id`

**Permission:** `fees.discount.update`  
Only PENDING discounts can be deleted. Returns `204 No Content`.

Error codes: `DISCOUNT_APPROVED` (400)

---

## Fees — Overdue

### GET `/fees/overdue`

**Permission:** `fees.invoice.read`  
Lists all invoices currently in OVERDUE status.

Query params: `page` · `limit` · `classId` · `academicYear`

---

### GET `/fees/overdue/defaulters`

**Permission:** `fees.invoice.read`  
Students with 2 or more overdue invoices.

---

### POST `/fees/overdue/apply-late-fees`

**Permission:** `fees.invoice.update`  
Applies the configured late fee rule to all OVERDUE invoices that haven't had late fees applied yet.

```typescript
// Response 201
interface LateFeeResult {
  processed: number;
  applied: number;
  skipped: number;
}
```

---

### POST `/fees/overdue/send-reminders`

**Permission:** `fees.invoice.read`  
Queues reminder notifications for students with overdue invoices.

```typescript
// Response 201
{ queued: number }
```

---

## Fees — Student Detail

### GET `/fees/student-fees`

**Permission:** `fees.invoice.read`  
Lists all student fee assignments.

Query params: `page` · `limit` · `classId` · `academicYear` · `status`

```typescript
// Response 200: Paginated<StudentFeeAssignment>
```

---

### GET `/fees/student-fees/:studentId/detail`

**Permission:** `fees.invoice.read`  
Full fee picture for a single student — everything on one screen.

```typescript
// Response 200
interface StudentFeeDetail {
  student: {
    id: UUID;
    fullName: string;
    userCode: string;
    className?: string;
    academicYear?: AcademicYear;
  };
  feeAssignment?: StudentFeeAssignment;
  invoices: FeeInvoice[];
  payments: FeePayment[];
  discounts: FeeDiscount[];
  summary: {
    totalInvoiced: DecimalString;
    totalPaid: DecimalString;
    totalDiscount: DecimalString;
    outstanding: DecimalString;
  };
}
```

---

## Fees — Dashboard

### GET `/fees/dashboard/summary`

**Permission:** `fees.report.read`

```typescript
interface FeeDashboardSummary {
  totalInvoiced: DecimalString;
  totalCollected: DecimalString;
  totalOutstanding: DecimalString;
  totalOverdue: DecimalString;
  collectionRate: string;        // "76.00" (percentage string)
}
```

---

### GET `/fees/dashboard/collection-chart`

**Permission:** `fees.report.read`

Query params: `groupBy` (`month` | `week` | `day`) · `from` (DateString) · `to` (DateString)

```typescript
interface CollectionDataPoint {
  period: string;                // "2026-05" or "2026-W21" or "2026-05-26"
  collected: DecimalString;
  invoiced: DecimalString;
}
// Response 200: CollectionDataPoint[]
```

---

### GET `/fees/dashboard/class-wise-summary`

**Permission:** `fees.report.read`  
Per-class breakdown of invoiced vs collected.

```typescript
interface ClassWiseSummary {
  classId: UUID;
  className: string;
  totalInvoiced: DecimalString;
  totalCollected: DecimalString;
  outstanding: DecimalString;
  studentCount: number;
}
// Response 200: ClassWiseSummary[]
```

---

### GET `/fees/dashboard/overdue-summary`

**Permission:** `fees.report.read`  
Top overdue invoices sorted by amount.

---

## Fees — Reports

All report endpoints require **`fees.report.read`**.

### GET `/fees/reports/collection-summary`

Query params: `from` · `to` · `classId` · `academicYear`

### GET `/fees/reports/class-wise-collection`

Query params: `academicYear` · `from` · `to`

### GET `/fees/reports/student-ledger/:studentId`

Full transaction history for one student.  
Query params: `academicYear` · `from` · `to`

### GET `/fees/reports/outstanding`

All invoices with unpaid balances.  
Query params: `classId` · `academicYear`

### GET `/fees/reports/defaulters`

Students with ≥2 overdue invoices.  
Query params: `classId` · `academicYear`

### GET `/fees/reports/daily-collection`

Query params: `from` (DateString) · `to` (DateString)

### GET `/fees/reports/monthly-collection`

Query params: `year` (e.g. `2026`)

```typescript
interface MonthlyCollectionRow {
  month: string;             // "2026-01"
  totalInvoiced: DecimalString;
  totalCollected: DecimalString;
  outstanding: DecimalString;
}
// Response 200: MonthlyCollectionRow[]
```

### GET `/fees/reports/payment-method-summary`

Query params: `from` · `to`

```typescript
interface PaymentMethodRow {
  method: PaymentMethod;
  count: number;
  totalAmount: DecimalString;
}
```

### GET `/fees/reports/discount-scholarship-summary`

Query params: `academicYear` · `from` · `to`

---

## Fees — Settings

### GET `/fees/settings`

**Permission:** `fees.settings.read`

```typescript
// Response 200: FeeSettings (see TypeScript Interfaces section)
```

---

### PUT `/fees/settings`

**Permission:** `fees.settings.update`

```typescript
type UpdateFeeSettingsRequest = Partial<Omit<FeeSettings, 'tenantId' | 'lateFeeRule'>>;
```

---

### GET `/fees/settings/late-fee`

**Permission:** `fees.settings.read`

```typescript
// Response 200: LateFeeRule
```

---

### PUT `/fees/settings/late-fee`

**Permission:** `fees.settings.update`

```typescript
// Request: LateFeeRule (see TypeScript Interfaces section)
```

---

## Fees — Finance Mapping

Maps fees GL accounts (receivable, income, cash, bank) to the Finance module's GL account IDs.

### GET `/fees/finance-mapping`

**Permission:** `fees.settings.read`

```typescript
interface FinanceMapping {
  defaultReceivableAccountId?: UUID;
  defaultFeeIncomeAccountId?: UUID;
  defaultCashAccountId?: UUID;
  defaultBankAccountId?: UUID;
}
// Response 200: FinanceMapping
```

---

### PUT `/fees/finance-mapping`

**Permission:** `fees.settings.update`

```typescript
// Request: FinanceMapping (all fields optional)
// Response 200: FinanceMapping
```

---

## Fees — Audit Logs

Every state-changing operation in the Fees module writes an immutable audit entry.

### GET `/fees/audit-logs`

**Permission:** `fees.audit.read`

Query params: `page` · `limit` · `action` · `studentId` · `invoiceId` · `from` (DateString) · `to` (DateString)

```typescript
interface FeeAuditLog {
  id: UUID;
  tenantId: UUID;
  action: string;          // e.g. "INVOICE_GENERATED", "PAYMENT_RECORDED"
  actorUserId: UUID;
  entityId?: UUID;
  entityType?: string;
  studentId?: UUID;
  invoiceId?: UUID;
  metadata?: Record<string, unknown>;
  createdAt: DateTimeString;
}
// Response 200: Paginated<FeeAuditLog>
```

---

### GET `/fees/audit-logs/:id`

**Permission:** `fees.audit.read`

```typescript
// Response 200: FeeAuditLog
```

---

## Platform Audit Logs

### GET `/audit-logs`

**Permission:** `audit.read` — platform events (auth, users, permissions).

Query params: `page` · `limit` · `module` · `action` · `actorUserId` · `from` · `to`

---

### GET `/audit-logs/finance`

**Permission:** `audit.read` — finance module events.

---

## Metadata & Dropdowns

### GET `/metadata/drop-downs`

**Auth required.** All dropdown options in one call — useful for populating forms.

```typescript
interface MetadataDropdowns {
  roles: Array<{ value: string; label: string }>;
  userStatuses: Array<{ value: string; label: string }>;
  transactionTypes: Array<{ value: string; label: string }>;
  paymentMethods: Array<{ value: PaymentMethod; label: string }>;
  discountTypes: Array<{ value: DiscountType; label: string }>;
  glAccountTypes: Array<{ value: GlAccountType; label: string }>;
}
```

---

### GET `/metadata/roles/assignable`

**Auth required.** Only the roles the current user is allowed to assign (role-based gate).

---

### GET `/metadata/finance/dropdowns`

**Auth required.** Finance-specific options.

---

### GET `/metadata/fees/dropdowns`

**Auth required.** Returns all reference data for fee forms in one call.

```typescript
interface FeeDropdowns {
  classes: Array<{ id: UUID; name: string; sortOrder: number }>;
  paymentMethods: Array<{ value: PaymentMethod; label: string }>;
  invoiceStatuses: Array<{ value: InvoiceStatus; label: string }>;
  discountTypes: Array<{ value: DiscountType; label: string }>;
  componentTypes: Array<{ value: FeeComponentType; label: string }>;
  academicYears: string[];  // last 5 and next 2 years
}
```

---

## Public Endpoints

### GET `/`

Health check — no auth.

```json
{ "status": "ok", "service": "SMS Tenant Finance API", "timestamp": "..." }
```

---

### POST `/waitlist`

No auth.

```typescript
interface WaitlistRequest {
  email: string;
  name: string;
  schoolName: string;
}
```

---

## Frontend Integration Patterns

### 1. Store tokens securely

```typescript
// After login
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);

// On logout
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

> **Security note:** `localStorage` is acceptable for school SaaS. For higher-security contexts, use `httpOnly` cookies.

---

### 2. Attach token to every request

```typescript
// Axios request interceptor
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

### 3. Auto-refresh on 401

```typescript
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const code = error.response?.data?.code;

    if (error.response?.status === 401 && code === 'AUTH_TOKEN_INVALID') {
      if (isRefreshing) {
        // Queue all requests that arrive while refresh is in flight
        return new Promise((resolve) => {
          queue.push((newToken) => {
            error.config.headers.Authorization = `Bearer ${newToken}`;
            resolve(axios(error.config));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        queue.forEach((cb) => cb(data.accessToken));
        queue = [];
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return axios(error.config);
      } catch {
        // Refresh failed — send to login
        localStorage.clear();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 4. Bootstrap on app load

```typescript
// Call once after login
const bootstrap = await api.get<BootstrapResponse>('/dashboard/bootstrap');
const { permissions, tenant, user } = bootstrap.data;

// Helper: check permission before rendering a button/route
const can = (key: string) => permissions.flat.includes(key);

// Usage
if (can('fees.invoice.create')) { /* show "New Invoice" button */ }
if (!tenant.features.finance)   { /* hide Finance menu item */ }
```

---

### 5. Invoice → Payment workflow

```typescript
// Step 1: load class list (for selector)
const classes = await api.get<Paginated<AcademicClass>>('/academics/classes');

// Step 2: load fee structure for the class
const structures = await api.get<Paginated<FeeStructure>>(
  `/fees/structures?classId=${classId}&status=ACTIVE`
);

// Step 3: bulk-generate invoices for the month
const result = await api.post<GenerateResult>('/fees/invoices/generate', {
  classId,
  feeStructureId,
  academicYear: '2025-2026',
  month: '2026-05',
  issueDate: '2026-05-01',
  dueDate: '2026-05-10',
} satisfies GenerateInvoicesRequest);
// result.data = { generated: 38, skipped: 2 }

// Step 4: display invoice list
const invoices = await api.get<Paginated<FeeInvoice>>(
  `/fees/invoices?classId=${classId}&month=2026-05`
);

// Step 5: record payment for a student
const paymentResp = await api.post<CreateFeePaymentResponse>('/fees/payments', {
  invoiceId,
  amount: '5500.00',
  paymentMethod: 'CASH',
  paymentDate: '2026-05-05',
} satisfies CreateFeePaymentRequest);
const { payment, receipt } = paymentResp.data;

// Step 6: print receipt
const printData = await api.get<ReceiptPrintData>(
  `/fees/receipts/${receipt.id}/print`
);
```

---

### 6. Fee structure lifecycle

```
POST /fees/structures        → status: DRAFT
PATCH /fees/structures/:id   → edit (DRAFT only)
POST  /fees/structures/:id/activate     → status: ACTIVE
POST  /fees/structures/:id/apply-to-students
POST  /fees/invoices/generate
...
POST  /fees/structures/:id/deactivate   → status: INACTIVE
POST  /fees/structures/:id/copy-to-year → new DRAFT for next year
```

---

### 7. Discount approval workflow

```typescript
// Accountant submits discount request
const discount = await api.post<FeeDiscount>('/fees/discounts', {
  studentId,
  invoiceId,
  academicYear: '2025-2026',
  type: 'SCHOLARSHIP',
  discountMode: 'PERCENTAGE',
  value: '25',
  reason: 'Merit scholarship award',
} satisfies CreateDiscountRequest);
// discount.data.status = 'PENDING'

// Principal approves (requires fees.discount.approve)
const approved = await api.post<FeeDiscount>(
  `/fees/discounts/${discount.data.id}/approve`,
  { notes: 'Approved for Q1' }
);
// approved.data.resolvedAmount = "1375.00"
// Invoice netAmount and balanceAmount already updated
```

---

### 8. Error handling pattern

```typescript
try {
  await api.post('/fees/payments', payload);
} catch (err) {
  if (!axios.isAxiosError(err) || !err.response) throw err;

  const { code, message } = err.response.data as {
    code: string;
    message: string;
  };

  switch (code) {
    case 'PAYMENT_EXCEEDS_BALANCE':
      showError('Amount exceeds outstanding balance.');
      break;
    case 'INVOICE_STATUS_INVALID':
      showError('Invoice is already paid or cancelled.');
      break;
    case 'PARTIAL_PAYMENT_NOT_ALLOWED':
      showError('Partial payments are disabled for this tenant.');
      break;
    case 'ADVANCE_PAYMENT_NOT_ALLOWED':
      showError('Advance payments are disabled for this tenant.');
      break;
    default:
      showError(message);
  }
}
```

---

### 9. Permissions-driven UI

```typescript
// React example — hide entire sections based on feature flags + permissions
function FeesMenu() {
  const { tenant, permissions } = useBootstrap();
  if (!tenant.features.fees) return null;

  return (
    <nav>
      {permissions.flat.includes('fees.invoice.read') && (
        <Link to="/fees/invoices">Invoices</Link>
      )}
      {permissions.flat.includes('fees.payment.create') && (
        <Link to="/fees/payments/new">Record Payment</Link>
      )}
      {permissions.flat.includes('fees.report.read') && (
        <Link to="/fees/reports">Reports</Link>
      )}
    </nav>
  );
}
```

---

### 10. Paginated list helper

```typescript
async function fetchAll<T>(
  url: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const limit = 100;
  let page = 1;
  const results: T[] = [];

  while (true) {
    const { data } = await api.get<Paginated<T>>(url, {
      params: { ...params, page, limit },
    });
    results.push(...data.data);
    if (results.length >= data.total) break;
    page++;
  }

  return results;
}
```
