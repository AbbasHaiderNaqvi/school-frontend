# Complete Finance & Approval System Implementation

## Overview
A comprehensive multi-level approval workflow system for school expenses with threshold-based approvals, audit trails, and financial reporting.

## Core Components

### 1. Expense Approval Workflow

#### Approval Chain Based on Amount
- **Under Threshold**: Requires Principal approval only
- **Over Threshold**: Requires Principal approval → Tenant Owner (final) approval

#### Expense Statuses
- `draft` - Created but not submitted
- `submitted` - Submitted for approval
- `pending_approval` - In approval workflow
- `approved` - All approvals completed
- `rejected` - Rejected at any approval stage

#### Approval Steps
Each expense has an approval chain with:
- `approverRole`: Which role must approve (principal, tenant_owner)
- `approverUserId`: User who approved
- `approverName`: Name of approver
- `status`: pending, approved, rejected, skipped
- `order`: Sequence in approval chain
- `approvedAt`: Timestamp of approval
- `comments`: Notes from approver

### 2. Threshold Management

#### Features
- Owner can view and change the expense approval threshold
- Complete audit trail of all threshold changes
- Shows who changed it, when, from what to what, and why

#### Threshold History Tracking
Each change records:
- `changedBy`: User ID of person making change
- `changedByName`: Name of person
- `changedByRole`: Role of person (validation that only owners can change)
- `oldThreshold`: Previous threshold amount
- `newThreshold`: New threshold amount
- `reason`: Why the change was made
- `changedAt`: Timestamp of change

### 3. Approval Dashboard (`/dashboard/approvals`)

#### Views (Tab-based)
1. **Pending Approvals**
   - Shows expenses awaiting user's approval
   - Displays if expense requires owner approval (over threshold)
   - One-click Review button

2. **Approved Expenses**
   - Historical record of approved expenses
   - Shows approval date
   - Full approval chain visible

3. **Rejected Expenses**
   - Shows rejections with reasons
   - Track rejection history

#### Approval Dialog
- Expense details (amount, vendor, category, requestor)
- Full approval chain with status and timestamps
- Add comments before approval/rejection
- Approve or Reject buttons with confirmation

### 4. Threshold Management Page (`/dashboard/finance/threshold`)

#### Features (Owner/Super Admin Only)
- Display current approval threshold
- View complete threshold change history in table
- Update button opens dialog for new threshold
- Shows amount change (+ or -)
- Optional reason for documentation

#### History Table Shows
- Date & time of change
- Who changed it (name & role)
- Previous amount
- New amount
- Change amount (colored green/red)
- Reason (if provided)

### 5. Financial Reports (`/dashboard/finance/reports`)

#### Summary Cards
- Total Assets
- Total Liabilities
- Total Income
- Total Expenses

#### Tabs

**GL Accounts**
- All active general ledger accounts
- Account code, name, type, balance
- Organized by account type

**Transactions**
- Full transaction history
- Date range filtering
- Shows debit/credit accounts and amounts
- Reference numbers

**Expenses**
- Expense summary and history
- Filter by category
- Status tracking
- Payment status

**Budgets**
- Budget vs. actual spending
- Progress bars showing % spent
- Status indicators (active, paused, exhausted)
- Total allocated vs. spent

#### Export Options
- Export to PDF
- Export to CSV

## Database/Storage Schema

### Expense Type
```typescript
interface Expense {
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
```

### ApprovalStep Type
```typescript
interface ApprovalStep {
  id: string
  approverRole: UserRole
  approverUserId?: string
  approverName?: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  approvedAt?: string
  comments?: string
  order: number
}
```

### ThresholdHistory Type
```typescript
interface ThresholdHistory {
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
```

## Access Control

### By Role

**tenant_owner**
- View all expenses
- Approve/reject expenses over threshold
- Change approval threshold
- View threshold history
- View all financial reports

**principal**
- View pending approvals for their role
- Approve/reject expenses under threshold
- View financial reports

**admin / admin_assistant**
- Create expenses
- View own expenses
- Cannot approve

**accountant**
- Create expenses
- Manage payments
- View financial reports
- Cannot approve

**super_admin**
- Full access to all features

## Service Methods

### Finance Service

```typescript
// Approval Management
approveExpense(id, approverUserId, approverName, comments)
rejectExpense(id, approverUserId, approverName, comments)
getExpensesByStatus(tenantId, status)
getPendingApprovals(tenantId, approverRole)

// Threshold Management
updateThreshold(tenantId, newThreshold, changedBy, reason)
getThresholdHistory(tenantId)
getCurrentThreshold(tenantId)
checkRequiresOwnerApproval(tenantId, amount)

// Expense Creation
createExpenseWithApprovalChain(expense)

// Reporting
getTransactions(tenantId)
getBudgets(tenantId)
getExpenses(tenantId)
```

## Workflow Example

1. **Admin creates expense** for $8,000 (threshold is $5,000)
   - Status: draft

2. **Admin submits expense**
   - Status: pending_approval
   - Approval chain created:
     - Step 1: principal (pending)
     - Step 2: tenant_owner (pending) - because $8,000 > $5,000 threshold

3. **Principal reviews and approves**
   - Step 1: principal (approved, 2024-01-15 10:30 AM)
   - Step 2: tenant_owner (pending)
   - Expense status: still pending_approval

4. **Tenant Owner reviews and approves**
   - Step 1: principal (approved)
   - Step 2: tenant_owner (approved, 2024-01-15 11:15 AM)
   - Expense status: approved

5. **Owner later increases threshold to $10,000**
   - Threshold change recorded:
     - Changed by: Owner
     - Old: $5,000 → New: $10,000
     - Reason: "Adjusted for new fiscal year"
     - Change recorded: 2024-02-01 14:00 PM

## Navigation

### Sidebar Items

**For Tenant Owners:**
- Approvals (CheckCircle2 icon) - Review pending approvals
- Finance > Approval Threshold (DollarSign icon) - Manage threshold and view history

**For Principals:**
- Approvals (CheckCircle2 icon) - Review pending approvals

**For All:**
- Finance > Reports - View financial statements and reports

## Data Persistence

All data is currently stored in localStorage through the service layer:
- `STORAGE_KEYS.EXPENSES` - All expenses
- `STORAGE_KEYS.THRESHOLD_HISTORY` - Threshold change history
- `STORAGE_KEYS.GL_ACCOUNTS` - General ledger accounts
- `STORAGE_KEYS.TRANSACTIONS` - Financial transactions
- `STORAGE_KEYS.BUDGETS` - Budget data

Easy to migrate to backend APIs by updating service methods only.

## Demo Credentials for Testing

- **Tenant Owner**: `owner@school1.com` / `owner123`
- **Principal**: `principal@school1.com` / `principal123`
- **Admin**: `admin@school1.com` / `admin123`
- **Accountant**: `accountant@school1.com` / `acc123`

## Testing Scenarios

### Scenario 1: Expense Under Threshold
1. Login as Admin
2. Create expense for $3,000 (threshold $5,000)
3. Submit expense
4. Login as Principal
5. Go to Approvals → Approve
6. Expense should show as Approved

### Scenario 2: Expense Over Threshold
1. Login as Admin
2. Create expense for $7,000
3. Submit expense
4. Login as Principal
5. Go to Approvals → Approve
6. Login as Owner
7. Go to Approvals → See expense pending owner approval
8. Approve expense
9. Expense shows as Approved with both signatures

### Scenario 3: Threshold Management
1. Login as Owner
2. Go to Finance > Approval Threshold
3. View current threshold and history
4. Change threshold to $8,000 with reason "Quarterly review"
5. See history entry created immediately
6. Test new threshold on next expense

## Features Ready for API Integration

All services use localStorage but are structured for easy API migration:
- Each service method can be converted to API call
- Type safety maintained throughout
- Audit logging in place
- Error handling in place
- No hard dependencies on localStorage in business logic
