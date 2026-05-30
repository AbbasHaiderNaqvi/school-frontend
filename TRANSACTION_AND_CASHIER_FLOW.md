# Transaction & Cashier Flow - Mudirr School Management System

## Overview
Complete financial management system with transaction flow for general accounting and dedicated cashier counter flow for fee collection and other income.

---

## 1. General Transaction Flow

### Location
`/dashboard/finance/transactions-flow`

### Features

#### Add Transaction
- **Transaction Types**: Income, Expense, Adjustment, Transfer
- **Categories**: Dynamically updated based on transaction type
  - Income: Fees, Donations, Government Grant, Interest, Other
  - Expense: Salary, Utilities, Supplies, Maintenance, Other
  - Adjustment: Reversal, Correction, Write-off, Other
  - Transfer: Between Accounts

#### Transaction Management
- **Add**: Create new transactions with amount, description, reference
- **Edit**: Modify existing transactions
- **Delete**: Remove transactions with audit trail
- **Real-time Updates**: GL accounts automatically updated

#### Summary Dashboard
- **Total Income**: Sum of all income transactions
- **Total Expense**: Sum of all expense transactions
- **Net Balance**: Income minus expenses with visual indicator
- **Transaction Count**: Shows breakdown by type

#### Transaction Table
- Date, Type (badge-styled), Category, Description
- Amount (color-coded: green for income, red for expense)
- Reference tracking for reconciliation
- Status indicator (draft, pending, approved, reconciled)
- Action buttons (edit, delete)

#### Access Control
- Accountant, Admin, Principal, Owner, Trustee can access
- Full CRUD operations available

---

## 2. Cashier Counter Flow

### Location
`/dashboard/cashier/counter`

### Two Main Sections

#### A. Collect Fees Tab

**Student Selection**
- Search students by name or roll number
- Display class information
- Real-time student list filtering

**Fee Display**
- Shows all pending fees for selected student
- Displays due date
- Shows pending amount vs. already paid
- Status indicator

**Payment Recording**
- Enter payment amount
- Multiple payment methods:
  - Cash
  - Cheque
  - Card
  - Bank Transfer
  - Online
- Optional reference (cheque number, transaction ID)
- Automatic receipt generation
- Receipt printing capability

#### B. Today's Collection Tab

**Daily Summary**
- Shows all collections for the day
- Separates fee collections from other income
- Quick daily reconciliation
- Delete capability for entry corrections

**Collection Details**
- Time of collection
- Type (Fee or Other Income)
- Description/Student Name
- Payment method
- Amount collected
- Collected by (staff name)

#### Payment Methods
- Cash
- Cheque (with number tracking)
- Card
- Bank Transfer
- Online

#### Daily Summary Cards
1. **Total Collection (Today)**
   - Overall total for the day
   - Transaction count

2. **Fees Collected**
   - Total from student fee payments
   - Number of fee payments

3. **Other Income**
   - Total from other income sources
   - Number of other income entries

---

## 3. Other Income Entry

### Categories Supported
- Uniform Sale
- Books & Stationery
- Donation
- Event Fee
- Late Fee
- Other

### Process
1. Click "Add Other Income" button
2. Select category
3. Enter amount
4. Add description (optional)
5. Select payment method
6. Record

### Storage
- Stored in daily collection ledger
- Can be deleted if entry error
- Included in daily summary report

---

## 4. Receipt Generation

### Automatic Receipt Features
- Generated after every fee payment
- Contains:
  - Receipt number (auto-generated: RCP-TIMESTAMP)
  - Student details
  - Payment date and time
  - Amount paid
  - Payment method
  - School branding (MD Grammar School)
  - School address and contact info

### Receipt Format
- Professional HTML template
- Ready for printing
- Download option
- Suitable for archival

---

## 5. Daily Collection Report

### Available Data
- Collection date
- Total amount collected
- Fee collection breakdown
- Other income breakdown
- Payment method breakdown
- Individual transaction details
- Collected by staff member

### Features
- Real-time updates
- Entry deletion capability
- Daily reconciliation
- Export ready

---

## 6. Access Control

### Cashier Counter Access
- Accountant
- Administrator

### Transaction Flow Access
- Accountant
- Administrator
- Principal
- Owner
- Trustee

### Owner/Trustee Permissions
- View all transactions
- Approve transactions
- Access full reports
- Manage thresholds

---

## 7. Data Integrity

### Audit Trail
- Every transaction logged
- User who created entry tracked
- Timestamp recorded
- Delete operations recorded

### Storage
- Financial transactions stored in STORAGE_KEYS.FINANCIAL_TRANSACTIONS
- Daily collections stored in 'cashier_daily_collection'
- Receipts stored in STORAGE_KEYS.RECEIPTS

### Validation
- Amount must be positive
- All required fields must be filled
- Date validation
- Duplicate prevention

---

## 8. Navigation

### In Sidebar
- **Finance Menu**
  - Transaction Flow: Add/Edit/Delete any school transaction
  - Cashier (CRUD): Transaction management with CRUD

- **Main Menu**
  - Cashier Counter: Fee collection and other income

---

## 9. User Workflow Examples

### Scenario 1: Collecting Student Fees
1. Counter staff opens Cashier Counter
2. Searches for student
3. Selects student
4. Views pending fees
5. Clicks "Pay Now"
6. Enters amount, payment method
7. System generates receipt
8. Receipt printed for student
9. Entry added to daily collection

### Scenario 2: Recording Other Income
1. Counter staff opens Cashier Counter
2. Clicks "Add Other Income"
3. Selects category (e.g., Uniform Sale)
4. Enters amount and description
5. Selects payment method
6. Records entry
7. Amount shown in today's collection

### Scenario 3: Adding School Expense
1. Accountant opens Transaction Flow
2. Clicks "Add Transaction"
3. Selects Type: Expense
4. Selects Category: Maintenance
5. Enters amount: 5000
6. Adds description: "Roof repair"
7. Saves transaction
8. GL account updated
9. Transaction visible in records

### Scenario 4: Daily Reconciliation
1. End of day, cashier views Today's Collection tab
2. Verifies all entries
3. Checks total matches cash count
4. Can delete if entry error found
5. Report ready for owner/trustee review

---

## 10. Summary of Features

✓ Complete transaction flow for all financial entries
✓ Dedicated cashier counter for fee collection
✓ Multiple payment method support
✓ Automatic receipt generation and printing
✓ Daily collection reconciliation
✓ Other income tracking
✓ Edit/Delete capabilities with audit trail
✓ Role-based access control
✓ Real-time summary dashboard
✓ Student search and fee display
✓ Professional receipt templates
✓ Full financial transaction history
✓ Category-based organization
✓ Reference tracking for reconciliation
