# Role Standardization - Mudirr School Management System

## Standardized Tenant Roles

### 1. Tenant Owner / Society / Trustee (Super Admin of Tenant)
**Role Name:** `tenant_owner`
**Demo Account:** `owner@mdgrammar.edu` / `owner123`

**Highest authority within a tenant**

**Core Actions:**
- Create, update, suspend, and delete tenant users
- Assign roles & permissions
- Configure tenant-wide settings
- View complete audit logs

**Finance & Accounts:**
- Approve high-value expenses
- Configure expense thresholds
- View all financial reports
- Approve budgets and reallocations
- Access General Ledger (full access)

**Operations:**
- Approve major decisions (procurement, hiring, termination)
- View all modules and dashboards
- Override approvals if required

---

### 2. Tenant Admin
**Role Name:** `tenant_admin`
**Demo Account:** `admin@mdgrammar.edu` / `admin123`

**Operational admin (day-to-day management)**

**User & Role Management:**
- Create and manage users (except Owner)
- Assign predefined roles
- Reset passwords / activate / deactivate users

**System Operations:**
- Manage modules (Accounts, Attendance, Tasks, Inventory)
- Configure workflows (approval chains, notifications)
- Create & assign tasks
- View system-level reports

**Limits:**
- ❌ Cannot change super-admin settings
- ❌ Cannot override owner-level approvals

---

### 3. Tenant Accountant
**Role Name:** `tenant_accountant`
**Demo Account:** `accountant@mdgrammar.edu` / `acc123`

**Finance & accounting focused role**

**Accounting Actions:**
- Manage General Ledger entries
- Record income & expenses
- Create and manage budgets
- Generate financial reports
- Prepare expense requests for approval

**Reports:**
- Profit/Loss reports
- Expense summaries
- Budget vs Actual reports

**Limits:**
- ❌ Cannot approve high-value expenses
- ❌ No user management access

---

### 4. Tenant Cashier
**Role Name:** `tenant_cashier`
**Demo Account:** `cashier@mdgrammar.edu` / `cashier123`

**Transaction handling role**

**Cash & Fee Handling:**
- Collect payments (cash / online / cheque)
- Issue receipts
- Record daily collections
- Handle refunds (if allowed)

**Daily Operations:**
- View assigned invoices
- Update payment status
- Generate daily cash reports

**Limits:**
- ❌ Cannot access General Ledger configuration
- ❌ Cannot approve expenses
- ❌ No access to budgets

---

### 5. Tenant Principal
**Role Name:** `tenant_principal`
**Demo Account:** `principal@mdgrammar.edu` / `principal123`

**Academic & operational oversight**

**Academic Operations:**
- View attendance reports
- Monitor staff performance
- Approve academic-related tasks
- Receive alerts & notifications

**Management:**
- Create and assign tasks to staff
- View departmental reports
- Raise requests (expenses, resources)

**Limits:**
- ❌ No direct finance control
- ❌ No user or system configuration access

---

## Implementation Details

### Updated Files:
1. `/lib/types.ts` - Updated UserRole type with standardized roles
2. `/lib/services/auth.ts` - Updated demo credentials with new roles
3. `/app/login/page.tsx` - Updated login page demo accounts
4. `/components/layout/app-sidebar.tsx` - Updated all role-based navigation
5. `/app/dashboard/page.tsx` - Updated dashboard routing
6. `/app/dashboard/settings/page.tsx` - Updated admin access checks

### Role-Based Access Control:

**User Management:**
- tenant_owner, tenant_admin (full access)

**Fee Collection:**
- tenant_cashier (primary), tenant_accountant, tenant_admin

**Finance Module:**
- GL Accounts: tenant_accountant, tenant_admin, tenant_owner
- Expenses: tenant_accountant, tenant_admin, tenant_principal
- Budgets: tenant_accountant, tenant_admin, tenant_owner
- Expense Approvals: tenant_owner, tenant_principal
- Threshold Config: tenant_owner only

**Fee Management:**
- Fee Structures: tenant_admin, tenant_accountant, tenant_owner
- Fee Collection: tenant_cashier, tenant_accountant, tenant_admin
- Fee Approvals: tenant_owner, tenant_admin

**HR & Employees:**
- All HR operations: tenant_admin, tenant_principal, hr, tenant_owner

**Inventory:**
- All inventory operations: tenant_admin, tenant_principal, tenant_owner

**Attendance:**
- All attendance: tenant_admin, tenant_principal, hr, teacher, tenant_owner

---

## Demo Accounts Summary

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| super@mdgrammar.edu | admin123 | Super Admin | Full system access |
| owner@mdgrammar.edu | owner123 | Tenant Owner | Highest authority - All approvals |
| admin@mdgrammar.edu | admin123 | Tenant Admin | Day-to-day management |
| accountant@mdgrammar.edu | acc123 | Tenant Accountant | Finance & accounting |
| cashier@mdgrammar.edu | cashier123 | Tenant Cashier | Collect payments & issue receipts |
| principal@mdgrammar.edu | principal123 | Tenant Principal | Academic & operational oversight |
| teacher@mdgrammar.edu | teacher123 | Teacher | Manage classes & students |
| hr@mdgrammar.edu | hr123 | HR Manager | Employee management |
| student@mdgrammar.edu | student123 | Student | View grades & fees |
| parent@mdgrammar.edu | parent123 | Parent | View children & fees |

---

## Testing the System

1. **As Tenant Owner (owner@mdgrammar.edu):**
   - Access all modules
   - Approve expenses and fees
   - Manage users
   - Configure thresholds

2. **As Tenant Admin (admin@mdgrammar.edu):**
   - Manage day-to-day operations
   - Create/edit users (except owner)
   - Access all modules except owner-only features

3. **As Tenant Accountant (accountant@mdgrammar.edu):**
   - Manage GL accounts
   - Record transactions
   - Create budgets
   - Cannot approve high-value expenses

4. **As Tenant Cashier (cashier@mdgrammar.edu):**
   - Collect fee payments
   - Issue receipts
   - View invoices
   - Cannot access GL or budgets

5. **As Tenant Principal (principal@mdgrammar.edu):**
   - View attendance reports
   - Approve academic tasks
   - Manage staff performance
   - Raise expense requests (cannot approve)

All roles have been standardized and permissions properly configured according to the specification.
