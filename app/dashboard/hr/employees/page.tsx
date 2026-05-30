'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, Edit, Trash2, Search, Phone, Mail, Calendar, DollarSign } from 'lucide-react'
import { hrService } from '@/lib/services/hr'
import { useUser } from '@/lib/hooks/use-user'
import type { Employee } from '@/lib/types'

export default function EmployeesPage() {
  const { user } = useUser()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joiningDate: '',
    salary: '',
    status: 'active' as const,
  })

  useEffect(() => {
    loadEmployees()
  }, [user])

  async function loadEmployees() {
    if (!user?.tenantId) return
    setLoading(true)
    try {
      const data = await hrService.getEmployees(user.tenantId)
      setEmployees(data)
    } catch (error) {
      console.error('[v0] Error loading employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.department.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      if (editingEmployee) {
        await hrService.updateEmployee(editingEmployee.id, {
          ...formData,
          salary: parseFloat(formData.salary),
        })
      } else {
        await hrService.createEmployee({
          tenantId: user.tenantId,
          userId: `user_${Date.now()}`,
          ...formData,
          salary: parseFloat(formData.salary),
          leaveBalance: 0,
        })
      }
      
      setIsAddDialogOpen(false)
      setEditingEmployee(null)
      resetForm()
      loadEmployees()
    } catch (error) {
      console.error('[v0] Error saving employee:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return
    
    try {
      await hrService.deleteEmployee(id)
      loadEmployees()
    } catch (error) {
      console.error('[v0] Error deleting employee:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      employeeCode: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joiningDate: '',
      salary: '',
      status: 'active',
    })
  }

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp)
    setFormData({
      employeeCode: emp.employeeCode,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      joiningDate: emp.joiningDate,
      salary: emp.salary.toString(),
      status: emp.status,
    })
    setIsAddDialogOpen(true)
  }

  const statusColors = {
    active: 'bg-green-500',
    on_leave: 'bg-yellow-500',
    terminated: 'bg-red-500',
  }

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your school staff</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setEditingEmployee(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee details' : 'Enter new employee information'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeCode">Employee Code *</Label>
                  <Input
                    id="employeeCode"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Teaching">Teaching</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation *</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date *</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Monthly Salary *</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'Update' : 'Create'} Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {employees.filter(e => e.status === 'on_leave').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terminated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {employees.filter(e => e.status === 'terminated').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Employee List */}
      <div className="grid gap-4">
        {filteredEmployees.map((emp) => (
          <Card key={emp.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{emp.name}</h3>
                      <p className="text-sm text-muted-foreground">{emp.designation} - {emp.department}</p>
                    </div>
                    <Badge className={statusColors[emp.status]}>
                      {emp.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {emp.email}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {emp.phone}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Joined: {new Date(emp.joiningDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      ${emp.salary.toLocaleString()}/month
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Code: <span className="font-medium">{emp.employeeCode}</span></span>
                    <span className="text-muted-foreground">Leave Balance: <span className="font-medium">{emp.leaveBalance} days</span></span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(emp)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(emp.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No employees found</p>
            <p className="text-muted-foreground">
              {search ? 'Try adjusting your search' : 'Get started by adding your first employee'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
