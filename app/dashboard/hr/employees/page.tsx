'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { hrService } from '@/lib/services/hr'
import type { Employee, Department, Designation, EmploymentType, EmployeeStatus, Gender } from '@/lib/services/hr'
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, Users,
  Link2, ImageIcon, UserCheck, ChevronDown,
} from 'lucide-react'

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY']
const EMPLOYEE_STATUSES: EmployeeStatus[] = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED']
const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER']

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
  RESIGNED: 'bg-orange-100 text-orange-800',
}

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  gender: '' as Gender | '',
  dateOfBirth: '', nationality: '', cnicOrPassport: '', address: '',
  departmentId: '', designationId: '',
  employmentType: '' as EmploymentType | '',
  joiningDate: '', contractEndDate: '', probationEndDate: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  bankAccountNumber: '', bankName: '', notes: '',
}

export default function EmployeesPage() {
  const { can } = useAuth()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [statusDialog, setStatusDialog] = useState<{ employee: Employee; status: EmployeeStatus } | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  const [linkDialog, setLinkDialog] = useState<Employee | null>(null)
  const [linkUserId, setLinkUserId] = useState('')
  const [isLinking, setIsLinking] = useState(false)

  const [picDialog, setPicDialog] = useState<Employee | null>(null)
  const [picUrl, setPicUrl] = useState('')
  const [isUpdatingPic, setIsUpdatingPic] = useState(false)

  const loadMeta = useCallback(async () => {
    const [depts, desigs] = await Promise.all([
      hrService.getDepartments({ limit: 200 }),
      hrService.getDesignations({ limit: 200 }),
    ])
    setDepartments(depts.data)
    setDesignations(desigs.data)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await hrService.getEmployees({
        limit: 200,
        search: search || undefined,
        departmentId: deptFilter || undefined,
        status: (statusFilter as EmployeeStatus) || undefined,
        employmentType: (typeFilter as EmploymentType) || undefined,
      })
      setEmployees(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load employees.')
    } finally {
      setIsLoading(false)
    }
  }, [search, deptFilter, statusFilter, typeFilter])

  useEffect(() => { loadMeta() }, [loadMeta])
  useEffect(() => { loadData() }, [loadData])

  if (!can('hr.employee.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError('')
    setDialogOpen(true)
  }

  const openEdit = (emp: Employee) => {
    setEditing(emp)
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone ?? '',
      gender: emp.gender ?? '',
      dateOfBirth: emp.dateOfBirth ?? '',
      nationality: emp.nationality ?? '',
      cnicOrPassport: emp.cnicOrPassport ?? '',
      address: emp.address ?? '',
      departmentId: emp.departmentId ?? '',
      designationId: emp.designationId ?? '',
      employmentType: emp.employmentType ?? '',
      joiningDate: emp.joiningDate ?? '',
      contractEndDate: emp.contractEndDate ?? '',
      probationEndDate: emp.probationEndDate ?? '',
      emergencyContactName: emp.emergencyContactName ?? '',
      emergencyContactPhone: emp.emergencyContactPhone ?? '',
      emergencyContactRelation: emp.emergencyContactRelation ?? '',
      bankAccountNumber: emp.bankAccountNumber ?? '',
      bankName: emp.bankName ?? '',
      notes: emp.notes ?? '',
    })
    setSubmitError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      gender: (form.gender as Gender) || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality.trim() || undefined,
      cnicOrPassport: form.cnicOrPassport.trim() || undefined,
      address: form.address.trim() || undefined,
      departmentId: form.departmentId || undefined,
      designationId: form.designationId || undefined,
      employmentType: (form.employmentType as EmploymentType) || undefined,
      joiningDate: form.joiningDate || undefined,
      contractEndDate: form.contractEndDate || undefined,
      probationEndDate: form.probationEndDate || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      emergencyContactRelation: form.emergencyContactRelation.trim() || undefined,
      bankAccountNumber: form.bankAccountNumber.trim() || undefined,
      bankName: form.bankName.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    const result = editing
      ? await hrService.updateEmployee(editing.id, payload)
      : await hrService.createEmployee(payload)

    if (result.error || !result.employee) {
      setSubmitError(result.error || 'Operation failed')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    await hrService.deleteEmployee(deleteConfirm.id)
    setDeleteConfirm(null)
    setIsDeleting(false)
    loadData()
  }

  const handleStatusChange = async () => {
    if (!statusDialog) return
    setIsChangingStatus(true)
    await hrService.updateEmployeeStatus(statusDialog.employee.id, statusDialog.status, statusReason || undefined)
    setStatusDialog(null)
    setStatusReason('')
    setIsChangingStatus(false)
    loadData()
  }

  const handleLinkUser = async () => {
    if (!linkDialog || !linkUserId.trim()) return
    setIsLinking(true)
    await hrService.linkEmployeeUser(linkDialog.id, linkUserId.trim())
    setLinkDialog(null)
    setLinkUserId('')
    setIsLinking(false)
    loadData()
  }

  const handleUpdatePic = async () => {
    if (!picDialog || !picUrl.trim()) return
    setIsUpdatingPic(true)
    await hrService.updateProfilePicture(picDialog.id, picUrl.trim())
    setPicDialog(null)
    setPicUrl('')
    setIsUpdatingPic(false)
    loadData()
  }

  const getInitials = (emp: Employee) =>
    `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  const filteredDesignations = form.departmentId
    ? designations.filter(d => d.departmentId === form.departmentId || !d.departmentId)
    : designations

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage your organisation's employees"
        action={
          can('hr.employee.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Employees ({total})</CardTitle>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter || 'all'} onValueChange={v => setDeptFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
                {employees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.profilePicture} alt={emp.fullName ?? emp.firstName} />
                          <AvatarFallback className="text-xs">{getInitials(emp)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{emp.fullName ?? `${emp.firstName} ${emp.lastName}`}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{emp.departmentName ?? '—'}</TableCell>
                    <TableCell className="text-sm">{emp.designationName ?? '—'}</TableCell>
                    <TableCell>
                      {emp.employmentType
                        ? <Badge variant="outline" className="text-xs">{emp.employmentType.replace('_', ' ')}</Badge>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[emp.status]}`}>
                        {emp.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('hr.employee.update') && (
                            <DropdownMenuItem onClick={() => openEdit(emp)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {can('hr.employee.update') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                    <UserCheck className="mr-2 h-4 w-4" /> Change Status
                                    <ChevronDown className="ml-auto h-3 w-3" />
                                  </DropdownMenuItem>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="left">
                                  {EMPLOYEE_STATUSES.filter(s => s !== emp.status).map(s => (
                                    <DropdownMenuItem key={s} onClick={() => { setStatusDialog({ employee: emp, status: s }); setStatusReason('') }}>
                                      {s.replace('_', ' ')}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <DropdownMenuItem onClick={() => { setLinkDialog(emp); setLinkUserId('') }}>
                                <Link2 className="mr-2 h-4 w-4" /> Link User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setPicDialog(emp); setPicUrl(emp.profilePicture ?? '') }}>
                                <ImageIcon className="mr-2 h-4 w-4" /> Profile Picture
                              </DropdownMenuItem>
                            </>
                          )}
                          {can('hr.employee.delete') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteConfirm(emp)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.firstName} ${editing.lastName}` : 'Create a new employee record.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input {...field('firstName')} placeholder="First name" className="mt-1" />
                </div>
                <div>
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input {...field('lastName')} placeholder="Last name" className="mt-1" />
                </div>
                <div>
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input {...field('email')} type="email" placeholder="email@example.com" className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...field('phone')} placeholder="+92 300 0000000" className="mt-1" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender || 'none'} onValueChange={v => setForm(f => ({ ...f, gender: v === 'none' ? '' : v as Gender }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Select —</SelectItem>
                      {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input {...field('dateOfBirth')} type="date" className="mt-1" />
                </div>
                <div>
                  <Label>Nationality</Label>
                  <Input {...field('nationality')} placeholder="e.g. Pakistani" className="mt-1" />
                </div>
                <div>
                  <Label>CNIC / Passport</Label>
                  <Input {...field('cnicOrPassport')} placeholder="ID number" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input {...field('address')} placeholder="Full address" className="mt-1" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Employment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Select value={form.departmentId || 'none'} onValueChange={v => setForm(f => ({ ...f, departmentId: v === 'none' ? '' : v, designationId: '' }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Select —</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Designation</Label>
                  <Select value={form.designationId || 'none'} onValueChange={v => setForm(f => ({ ...f, designationId: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select designation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Select —</SelectItem>
                      {filteredDesignations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select value={form.employmentType || 'none'} onValueChange={v => setForm(f => ({ ...f, employmentType: v === 'none' ? '' : v as EmploymentType }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Select —</SelectItem>
                      {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Joining Date</Label>
                  <Input {...field('joiningDate')} type="date" className="mt-1" />
                </div>
                <div>
                  <Label>Contract End Date</Label>
                  <Input {...field('contractEndDate')} type="date" className="mt-1" />
                </div>
                <div>
                  <Label>Probation End Date</Label>
                  <Input {...field('probationEndDate')} type="date" className="mt-1" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input {...field('emergencyContactName')} placeholder="Full name" className="mt-1" />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input {...field('emergencyContactPhone')} placeholder="Phone number" className="mt-1" />
                </div>
                <div>
                  <Label>Relation</Label>
                  <Input {...field('emergencyContactRelation')} placeholder="e.g. Spouse, Parent" className="mt-1" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Bank Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input {...field('bankName')} placeholder="e.g. HBL, UBL" className="mt-1" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input {...field('bankAccountNumber')} placeholder="Account number" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Input {...field('notes')} placeholder="Additional notes" className="mt-1" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.firstName} {deleteConfirm?.lastName}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change */}
      <Dialog open={!!statusDialog} onOpenChange={open => !open && setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Employee Status</DialogTitle>
            <DialogDescription>
              Change {statusDialog?.employee.firstName}&apos;s status to{' '}
              <strong>{statusDialog?.status.replace('_', ' ')}</strong>
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Input
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              placeholder="Reason for status change"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)} disabled={isChangingStatus}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={isChangingStatus}>
              {isChangingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link User */}
      <Dialog open={!!linkDialog} onOpenChange={open => !open && setLinkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link System User</DialogTitle>
            <DialogDescription>
              Link a system user account to {linkDialog?.firstName} {linkDialog?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>User ID <span className="text-destructive">*</span></Label>
            <Input
              value={linkUserId}
              onChange={e => setLinkUserId(e.target.value)}
              placeholder="User UUID"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)} disabled={isLinking}>Cancel</Button>
            <Button onClick={handleLinkUser} disabled={isLinking || !linkUserId.trim()}>
              {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Link2 className="mr-2 h-4 w-4" /> Link User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Picture */}
      <Dialog open={!!picDialog} onOpenChange={open => !open && setPicDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
            <DialogDescription>
              Set a profile picture URL for {picDialog?.firstName} {picDialog?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Image URL <span className="text-destructive">*</span></Label>
            <Input
              value={picUrl}
              onChange={e => setPicUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicDialog(null)} disabled={isUpdatingPic}>Cancel</Button>
            <Button onClick={handleUpdatePic} disabled={isUpdatingPic || !picUrl.trim()}>
              {isUpdatingPic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
