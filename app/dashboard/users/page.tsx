'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { usersService } from '@/lib/services/users'
import type { UserListItem, ApiUserRole } from '@/lib/services/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { ManageUserGroupsDialog } from '@/components/users/manage-user-groups-dialog'
import { metadataService, type AssignableRole } from '@/lib/services/metadata'
import { emailError, phoneError, hasNoErrors } from '@/lib/validation'
import {
  UserPlus, Edit, Trash2, Search, MoreHorizontal,
  Lock, CheckCircle, XCircle, Loader2, Copy, RefreshCw, ShieldCheck,
} from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

// Shown only if GET /metadata/roles/assignable fails — the API list is authoritative.
const FALLBACK_ROLES: AssignableRole[] = [
  { value: 'tenant_owner', label: 'Tenant Owner' },
  { value: 'tenant_admin', label: 'Admin' },
  { value: 'tenant_principal', label: 'Principal' },
  { value: 'tenant_accountant', label: 'Accountant' },
  { value: 'tenant_cashier', label: 'Cashier' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'hr', label: 'HR' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800',
  tenant_owner: 'bg-purple-100 text-purple-800',
  tenant_admin: 'bg-blue-100 text-blue-800',
  tenant_principal: 'bg-indigo-100 text-indigo-800',
  tenant_accountant: 'bg-yellow-100 text-yellow-800',
  tenant_cashier: 'bg-cyan-100 text-cyan-800',
  teacher: 'bg-green-100 text-green-800',
  hr: 'bg-orange-100 text-orange-800',
  student: 'bg-gray-100 text-gray-800',
  parent: 'bg-pink-100 text-pink-800',
}

export default function UserManagementPage() {
  const { can } = useAuth()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [roleOptions, setRoleOptions] = useState<AssignableRole[]>(FALLBACK_ROLES)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [setupUrl, setSetupUrl] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [manageGroupsUser, setManageGroupsUser] = useState<UserListItem | null>(null)

  const [addForm, setAddForm] = useState({
    fullName: '', email: '', role: 'teacher' as ApiUserRole, phone: '',
    employeeId: '', studentId: '', parentId: '',
  })
  const [editForm, setEditForm] = useState({ fullName: '', phone: '' })

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')
    const result = await usersService.list({
      page,
      limit: 20,
      search: search || undefined,
      role: roleFilter !== 'all' ? (roleFilter as ApiUserRole) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as 'active' | 'inactive') : undefined,
    })
    setUsers(result.data)
    setTotal(result.total)
    setIsLoading(false)
  }, [page, search, roleFilter, statusFilter])

  useEffect(() => { loadUsers() }, [loadUsers])

  useEffect(() => {
    metadataService.getAssignableRoles()
      .then(roles => {
        if (roles.length > 0) {
          setRoleOptions(roles)
          setAddForm(f => (roles.some(r => r.value === f.role) ? f : { ...f, role: roles[0].value as ApiUserRole }))
        }
      })
      .catch(() => { /* keep fallback list */ })
  }, [])

  if (!can('users.user.read')) return <AccessDenied />

  const validateAdd = (): boolean => {
    const errors: Record<string, string> = {}
    const emailErr = emailError(addForm.email)
    if (emailErr) errors.email = emailErr
    const phoneErr = phoneError(addForm.phone, false)
    if (phoneErr) errors.phone = phoneErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {}
    const phoneErr = phoneError(editForm.phone, false)
    if (phoneErr) errors.phone = phoneErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleCreate = async () => {
    if (!validateAdd()) return
    setIsSubmitting(true)
    setSubmitError('')
    const payload = {
      fullName: addForm.fullName,
      email: addForm.email,
      role: addForm.role,
      phone: addForm.phone || undefined,
      employeeId: addForm.employeeId || undefined,
      studentId: addForm.studentId || undefined,
      parentId: addForm.parentId || undefined,
    }
    const result = await usersService.create(payload)
    if (result.error || !result.user) {
      setSubmitError(result.error || 'Failed to create user')
      setIsSubmitting(false)
      return
    }
    setSetupUrl(result.setupUrl || '')
    setAddForm({ fullName: '', email: '', role: 'teacher', phone: '', employeeId: '', studentId: '', parentId: '' })
    setIsSubmitting(false)
    loadUsers()
    if (!result.setupUrl) setIsAddOpen(false)
  }

  const handleUpdate = async () => {
    if (!selectedUser) return
    if (!validateEdit()) return
    setIsSubmitting(true)
    setSubmitError('')
    const updated = await usersService.update(selectedUser.id, editForm)
    if (!updated) {
      setSubmitError('Failed to update user')
      setIsSubmitting(false)
      return
    }
    setIsSubmitting(false)
    setIsEditOpen(false)
    setSelectedUser(null)
    loadUsers()
  }

  const handleDeactivate = async (u: UserListItem) => {
    await usersService.deactivate(u.id)
    loadUsers()
  }

  const handleReactivate = async (u: UserListItem) => {
    await usersService.reactivate(u.id)
    loadUsers()
  }

  const handleDelete = async (u: UserListItem) => {
    if (!confirm(`Delete user ${u.fullName}? This cannot be undone.`)) return
    await usersService.delete(u.id)
    loadUsers()
  }

  const handleResetPassword = async (u: UserListItem) => {
    const result = await usersService.resetPassword(u.id)
    if (result.setupUrl) {
      alert(`Password reset link:\n${result.setupUrl}`)
    }
  }

  const openEdit = (u: UserListItem) => {
    setSelectedUser(u)
    setEditForm({ fullName: u.fullName, phone: u.phone || '' })
    setSubmitError('')
    setFieldErrors({})
    setIsEditOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage users, roles, and account access"
        action={
          can('users.user.create') && (
            <Button onClick={() => { setSetupUrl(''); setSubmitError(''); setFieldErrors({}); setIsAddOpen(true) }}>
              <UserPlus className="mr-2 h-4 w-4" /> Invite User
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Users ({total})</CardTitle>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-4">
            <div className="relative sm:flex-1 sm:min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadUsers}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonTableRows rows={5} cols={6} />
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.userCode}</TableCell>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800'}>
                          {u.role.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? 'default' : 'secondary'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('users.user.update') && (
                              <DropdownMenuItem onClick={() => openEdit(u)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {can('users.user.reset_password') && (
                              <DropdownMenuItem onClick={() => handleResetPassword(u)}>
                                <Lock className="mr-2 h-4 w-4" /> Reset Password
                              </DropdownMenuItem>
                            )}
                            {can('permissions.assign') && (
                              <DropdownMenuItem onClick={() => setManageGroupsUser(u)}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> Manage Roles
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {u.isActive
                              ? can('users.user.deactivate') && (
                                  <DropdownMenuItem onClick={() => handleDeactivate(u)} className="text-orange-600">
                                    <XCircle className="mr-2 h-4 w-4" /> Deactivate
                                  </DropdownMenuItem>
                                )
                              : can('users.user.reactivate') && (
                                  <DropdownMenuItem onClick={() => handleReactivate(u)} className="text-green-600">
                                    <CheckCircle className="mr-2 h-4 w-4" /> Reactivate
                                  </DropdownMenuItem>
                                )
                            }
                            {can('users.user.delete') && (
                              <DropdownMenuItem onClick={() => handleDelete(u)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
              <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(o) => { if (!o) { setSetupUrl(''); setSubmitError(''); setFieldErrors({}) } setIsAddOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>An invitation link will be generated for the user to set their password.</DialogDescription>
          </DialogHeader>
          {setupUrl ? (
            <div className="space-y-3">
              <Alert><AlertDescription className="text-green-700">User created successfully!</AlertDescription></Alert>
              <div>
                <Label>Setup Link (share with user)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={setupUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(setupUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setSetupUrl(''); setIsAddOpen(false) }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Full Name</Label>
                    <Input value={addForm.fullName} onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Jane Smith" className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={addForm.email}
                      onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@school.edu"
                      className={`mt-1 ${fieldErrors.email ? 'border-destructive' : ''}`}
                    />
                    {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input
                      value={addForm.phone}
                      onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+92 300 0000000"
                      className={`mt-1 ${fieldErrors.phone ? 'border-destructive' : ''}`}
                    />
                    {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v as ApiUserRole, employeeId: '', studentId: '', parentId: '' }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {roleOptions.find(r => r.value === addForm.role)?.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {roleOptions.find(r => r.value === addForm.role)?.description}
                      </p>
                    )}
                  </div>
                  {addForm.role === 'student' ? (
                    <div className="col-span-2">
                      <Label>Student ID (optional)</Label>
                      <Input value={addForm.studentId} onChange={e => setAddForm(f => ({ ...f, studentId: e.target.value }))} placeholder="STD-MDG-0001" className="mt-1" />
                    </div>
                  ) : addForm.role === 'parent' ? (
                    <div className="col-span-2">
                      <Label>Parent ID (optional)</Label>
                      <Input value={addForm.parentId} onChange={e => setAddForm(f => ({ ...f, parentId: e.target.value }))} placeholder="PAR-MDG-0001" className="mt-1" />
                    </div>
                  ) : (
                    <div className="col-span-2">
                      <Label>Employee ID (optional)</Label>
                      <Input value={addForm.employeeId} onChange={e => setAddForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="EMP-MDG-0001" className="mt-1" />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isSubmitting || !addForm.fullName || !addForm.email}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Invite User
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update {selectedUser?.fullName}'s profile</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className={fieldErrors.phone ? 'border-destructive' : ''}
              />
              {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSubmitting || !editForm.fullName}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageUserGroupsDialog
        user={manageGroupsUser}
        open={!!manageGroupsUser}
        onOpenChange={(o) => !o && setManageGroupsUser(null)}
      />
    </div>
  )
}
