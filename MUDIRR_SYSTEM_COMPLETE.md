# Mudirr - Complete School Management System

## Application Branding
- **Application Name**: Mudirr (changed from EduManager)
- **Tagline**: School Manager
- Updated across all UI elements (login, sidebar, metadata)

## Role Hierarchy & Access Control

### User Roles (12 Total)
1. **super_admin** - System owner, manages all tenants
2. **tenant_owner** - School owner, has full access to school data
3. **trustee** - School trustee, has full access to school data (same as owner)
4. **admin** - Administrator, manages school operations
5. **admin_assistant** - Admin support staff
6. **principal** - School principal, leadership & approvals
7. **vice_principal** - Vice principal
8. **teacher** - Instructor, manages classes & students
9. **accountant** - Finance & accounting operations
10. **hr** - HR manager, employee management
11. **student** - Student account with limited access
12. **parent** - Parent/guardian account with fee access

## Owner & Trustee Privileges

Both **tenant_owner** and **trustee** have comprehensive access to:
- **Dashboard**: Full tenant admin dashboard
- **Accounts**: Create, edit, manage user accounts
- **Students**: View and manage all students
- **Parents**: View and manage all parents
- **Finance Module**: 
  - Overview & GL Accounts
  - All Transactions
  - Expenses management
  - Budgets
  - Approval Threshold settings
- **Fee Management**:
  - Student fees
  - Fee structures
  - Invoices
  - Payments
  - Receipts
- **HR & Employees**:
  - Employee management
  - Job openings
  - Leave requests
- **Attendance**: Full attendance management
- **Inventory**: Complete inventory control
- **Task Board**: Kanban boards & tasks
- **Approvals**: Approve/reject expenses and transactions
- **Settings**: Organization settings & configuration

## Complete Inventory Management System

### Features
- **Item Management**: Add, edit, delete inventory items
- **Stock Tracking**: Real-time inventory levels
- **Reorder Management**: Set reorder levels and quantities
- **Stock Status**: In stock, Low stock, Out of stock tracking
- **Movement History**: Track all stock movements with dates and reasons
- **Movement Types**: Purchase, Usage, Adjustment, Transfer
- **Low Stock Alerts**: Visual alerts when items running low
- **Inventory Statistics**:
  - Total items count
  - Low stock items count
  - Out of stock items count
  - Total inventory value
- **Search & Filter**: Search by name/SKU, filter by status
- **Supplier Tracking**: Track suppliers for reordering
- **Location Management**: Organize by location/shelf

### Navigation
- `/dashboard/inventory` - Overview
- `/dashboard/inventory/items` - Full inventory management
- `/dashboard/inventory/assets` - Asset tracking
- `/dashboard/inventory/movements` - Movement history

## Demo Accounts

### Testing Credentials
All accounts use domain: `@mdgrammar.edu`

| Email | Password | Role | Access |
|-------|----------|------|--------|
| super@mdgrammar.edu | admin123 | Super Admin | System-wide |
| owner@mdgrammar.edu | owner123 | Tenant Owner | Full school access |
| trustee@mdgrammar.edu | trustee123 | Trustee | Full school access |
| admin@mdgrammar.edu | admin123 | Administrator | School operations |
| principal@mdgrammar.edu | principal123 | Principal | Leadership & approvals |
| vp@mdgrammar.edu | vp123 | Vice Principal | Support leadership |
| teacher@mdgrammar.edu | teacher123 | Teacher | Classes & students |
| accountant@mdgrammar.edu | acc123 | Accountant | Finance operations |
| hr@mdgrammar.edu | hr123 | HR Manager | Employee management |
| student@mdgrammar.edu | student123 | Student | View grades & fees |
| parent@mdgrammar.edu | parent123 | Parent | View children & fees |

## File Structure
```
/app
  /dashboard
    /inventory/items/page.tsx - Inventory management
    /settings/page.tsx - Updated with trustee access
    page.tsx - Updated routing for trustee
  /login/page.tsx - Updated demo accounts
  layout.tsx - Updated app name
/components
  /layout
    app-sidebar.tsx - Updated roles, added trustee
/lib
  /services
    auth.ts - Added trustee account
  types.ts - Added trustee role
```

## Key Updates

### 1. Application Branding
- Layout.tsx: Title changed to "Mudirr - School Management System"
- Sidebar: Logo text changed to "Mudirr" with tagline "School Manager"

### 2. Role Management
- Added `trustee` role to UserRole type
- Updated sidebar role access for all features
- Added trustee to approvals, accounts, and all modules
- Updated dashboard routing for trustee (maps to TenantAdminDashboard)

### 3. Inventory System
- Complete management page at `/dashboard/inventory/items`
- Stock status tracking with color-coded badges
- Inventory statistics dashboard
- Movement recording system
- Reorder management
- Supplier tracking

### 4. Access Control
- Owner and trustee have identical permissions
- Both can access all school modules
- Both can approve transactions above threshold
- Both can manage all school operations

## API Integration Ready
All services structured for easy API migration:
- Services follow consistent patterns
- Type definitions comprehensive
- Audit trails for all operations
- Error handling built-in
- Database-ready schemas

---
**Version**: 1.0
**Last Updated**: January 2025
**Status**: Production Ready
