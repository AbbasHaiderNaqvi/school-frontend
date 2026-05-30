'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { hrService } from '@/lib/services/hr'
import { attendanceManagerService } from '@/lib/services/attendance-manager'
import { financeService } from '@/lib/services/finance'
import { storage, STORAGE_KEYS } from '@/lib/services/storage'
import { generateId } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Calendar, Users, Download, CheckCircle, XCircle } from 'lucide-react'

interface PayrollRecord {
  id: string
  tenantId: string
  employeeId: string
  employeeName: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  workingDays: number
  presentDays: number
  leaveDays: number
  netSalary: number
  status: 'draft' | 'approved' | 'paid'
  generatedBy: string
  generatedAt: string
  approvedBy?: string
  approvedAt?: string
  paidAt?: string
}

export default function PayrollPage() {
  const { user } = useAuth()
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (user?.tenantId) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user?.tenantId) return
    try {
      setIsLoading(true)
      const [empData, payrollData] = await Promise.all([
        hrService.getEmployees(user.tenantId),
        loadPayrollRecords(user.tenantId)
      ])
      setEmployees(empData.filter(e => e.status === 'active'))
      setPayrollRecords(payrollData)
    } catch (error) {
      console.error('[v0] Error loading payroll data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPayrollRecords = async (tenantId: string): Promise<PayrollRecord[]> => {
    const records = storage.get<PayrollRecord[]>(STORAGE_KEYS.PAYROLL_RECORDS) || []
    return records.filter(r => r.tenantId === tenantId)
  }

  const generatePayroll = async () => {
    if (!user?.tenantId) return
    
    try {
      setIsLoading(true)
      const newRecords: PayrollRecord[] = []

      for (const employee of employees) {
        // Get attendance data
        const attendanceData = await attendanceManagerService.getEmployeeAttendance(
          employee.id,
          `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`,
          `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`
        )

        const presentDays = attendanceData.filter((a: any) => a.status === 'present').length
        const leaveDays = attendanceData.filter((a: any) => a.status === 'leave').length
        const workingDays = new Date(selectedYear, selectedMonth + 1, 0).getDate()

        // Calculate salary
        const dailySalary = employee.salary / 30
        const earnedSalary = dailySalary * presentDays
        const allowances = employee.allowances || 0
        const deductions = employee.deductions || 0
        const netSalary = earnedSalary + allowances - deductions

        const record: PayrollRecord = {
          id: generateId(),
          tenantId: user.tenantId,
          employeeId: employee.id,
          employeeName: employee.name,
          month: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' }),
          year: selectedYear,
          basicSalary: employee.salary,
          allowances,
          deductions,
          workingDays,
          presentDays,
          leaveDays,
          netSalary,
          status: 'draft',
          generatedBy: user.id,
          generatedAt: new Date().toISOString()
        }

        newRecords.push(record)
      }

      const allRecords = storage.get<PayrollRecord[]>(STORAGE_KEYS.PAYROLL_RECORDS) || []
      storage.set(STORAGE_KEYS.PAYROLL_RECORDS, [...allRecords, ...newRecords])
      
      await loadData()
      setShowGenerateDialog(false)
      alert(`Generated payroll for ${newRecords.length} employees`)
    } catch (error) {
      console.error('[v0] Error generating payroll:', error)
      alert('Failed to generate payroll')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (recordId: string) => {
    if (!user?.tenantId) return
    
    const allRecords = storage.get<PayrollRecord[]>(STORAGE_KEYS.PAYROLL_RECORDS) || []
    const index = allRecords.findIndex(r => r.id === recordId)
    
    if (index !== -1) {
      allRecords[index] = {
        ...allRecords[index],
        status: 'approved',
        approvedBy: user.id,
        approvedAt: new Date().toISOString()
      }
      storage.set(STORAGE_KEYS.PAYROLL_RECORDS, allRecords)
      await loadData()
    }
  }

  const handleMarkPaid = async (recordId: string) => {
    if (!user?.tenantId) return
    
    const allRecords = storage.get<PayrollRecord[]>(STORAGE_KEYS.PAYROLL_RECORDS) || []
    const index = allRecords.findIndex(r => r.id === recordId)
    
    if (index !== -1) {
      const record = allRecords[index]
      
      // Create expense transaction
      await financeService.createTransaction({
        tenantId: user.tenantId,
        type: 'expense',
        accountId: 'salary-expense',
        amount: record.netSalary,
        description: `Salary payment for ${record.employeeName} - ${record.month} ${record.year}`,
        date: new Date().toISOString(),
        category: 'Salaries',
        reference: `PAYROLL-${record.id}`,
        createdBy: user.id,
      })

      allRecords[index] = {
        ...allRecords[index],
        status: 'paid',
        paidAt: new Date().toISOString()
      }
      storage.set(STORAGE_KEYS.PAYROLL_RECORDS, allRecords)
      await loadData()
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const totalDraft = payrollRecords.filter(r => r.status === 'draft').reduce((sum, r) => sum + r.netSalary, 0)
  const totalApproved = payrollRecords.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.netSalary, 0)
  const totalPaid = payrollRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.netSalary, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll Management</h1>
          <p className="text-muted-foreground">Generate and manage employee payroll</p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)}>
          <Calendar className="mr-2 h-4 w-4" />
          Generate Payroll
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Payroll active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalDraft.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{payrollRecords.filter(r => r.status === 'draft').length} records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalApproved.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{payrollRecords.filter(r => r.status === 'approved').length} records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{payrollRecords.filter(r => r.status === 'paid').length} records</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>View and manage salary payments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payroll data...</div>
          ) : payrollRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payroll records found. Generate payroll to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Present Days</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>{record.month} {record.year}</TableCell>
                      <TableCell>{record.workingDays}</TableCell>
                      <TableCell>{record.presentDays}</TableCell>
                      <TableCell>₹{record.basicSalary.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">₹{record.netSalary.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleApprove(record.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {record.status === 'approved' && (
                          <Button size="sm" onClick={() => handleMarkPaid(record.id)}>
                            <DollarSign className="h-4 w-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        {record.status === 'paid' && (
                          <span className="text-sm text-green-600">✓ Paid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Payroll Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payroll</DialogTitle>
            <DialogDescription>Select month and year to generate payroll for all active employees</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Year</Label>
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              This will generate payroll for {employees.length} active employees based on attendance records.
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={generatePayroll} disabled={isLoading} className="flex-1">
                {isLoading ? 'Generating...' : 'Generate Payroll'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
