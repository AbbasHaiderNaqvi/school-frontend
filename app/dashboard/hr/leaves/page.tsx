'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Plus, CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { hrService } from '@/lib/services/hr'
import { TablePageSkeleton } from '@/components/ui/page-skeleton'
import { useUser } from '@/lib/hooks/use-user'
import type { LeaveRequest } from '@/lib/types'

export default function LeaveRequestsPage() {
  const { user } = useUser()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: 'sick' as const,
    startDate: '',
    endDate: '',
    reason: '',
  })

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    if (!user?.tenantId) return
    setLoading(true)
    try {
      const [leavesData, employeesData] = await Promise.all([
        hrService.getLeaveRequests(user.tenantId),
        hrService.getEmployees(user.tenantId),
      ])
      setLeaves(leavesData)
      setEmployees(employeesData)
    } catch (error) {
      console.error('[v0] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.tenantId) return

    const employee = employees.find(e => e.id === formData.employeeId)
    if (!employee) return

    try {
      await hrService.createLeaveRequest({
        tenantId: user.tenantId,
        employeeName: employee.name,
        status: 'pending',
        ...formData,
      })
      
      setIsAddDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('[v0] Error creating leave request:', error)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await hrService.updateLeaveRequest(id, {
        status: 'approved',
        approvedBy: user?.id,
      })
      loadData()
    } catch (error) {
      console.error('[v0] Error approving leave:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await hrService.updateLeaveRequest(id, {
        status: 'rejected',
        approvedBy: user?.id,
      })
      loadData()
    } catch (error) {
      console.error('[v0] Error rejecting leave:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      leaveType: 'sick',
      startDate: '',
      endDate: '',
      reason: '',
    })
  }

  const statusColors = {
    pending: 'bg-yellow-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
  }

  const leaveTypeLabels = {
    sick: 'Sick Leave',
    casual: 'Casual Leave',
    earned: 'Earned Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave',
  }

  if (loading) {
    return <TablePageSkeleton />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">Manage employee leave applications</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Leave Request</DialogTitle>
              <DialogDescription>Submit a new leave application</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee *</Label>
                <Select value={formData.employeeId} onValueChange={(value) => setFormData({ ...formData, employeeId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.employeeCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type *</Label>
                <Select value={formData.leaveType} onValueChange={(value: any) => setFormData({ ...formData, leaveType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="earned">Earned Leave</SelectItem>
                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                    <SelectItem value="paternity">Paternity Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Request</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {leaves.filter(l => l.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {leaves.filter(l => l.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {leaves.filter(l => l.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests List */}
      <div className="grid gap-4">
        {leaves.map((leave) => (
          <Card key={leave.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{leave.employeeName}</h3>
                      <p className="text-sm text-muted-foreground">{leaveTypeLabels[leave.leaveType]}</p>
                    </div>
                    <Badge className={statusColors[leave.status]}>
                      {leave.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration: {Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {leave.reason}
                  </div>

                  {leave.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="default" onClick={() => handleApprove(leave.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(leave.id)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {leaves.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No leave requests</p>
            <p className="text-muted-foreground">Leave applications will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
