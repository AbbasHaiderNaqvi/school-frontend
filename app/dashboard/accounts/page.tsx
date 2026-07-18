'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { useAuth } from '@/contexts/auth-context'
import { authService } from '@/lib/services/auth'
import type { User } from '@/lib/types'
import { emailError, hasNoErrors } from '@/lib/validation'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Lock,
  Check,
  X,
  Loader2,
  Users,
  Shield,
} from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800',
  tenant_owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  admin_assistant: 'bg-cyan-100 text-cyan-800',
  principal: 'bg-indigo-100 text-indigo-800',
  vice_principal: 'bg-violet-100 text-violet-800',
  teacher: 'bg-green-100 text-green-800',
  accountant: 'bg-amber-100 text-amber-800',
  hr: 'bg-orange-100 text-orange-800',
  student: 'bg-teal-100 text-teal-800',
  parent: 'bg-pink-100 text-pink-800',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_owner: 'Tenant Owner',
  admin: 'Administrator',
  admin_assistant: 'Admin Assistant',
  principal: 'Principal',
  vice_principal: 'Vice Principal',
  teacher: 'Teacher',
  accountant: 'Accountant',
  hr: 'HR Manager',
  student: 'Student',
  parent: 'Parent',
}

export default function AccountsPage() {
  const { user, tenant } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'teacher' as const,
    password: '',
  })

  const canManageAccounts =
    user?.role === 'super_admin' || user?.role === 'tenant_owner' || user?.role === 'admin'

  const loadUsers = async () => {
    setIsLoading(true)
    const demoUsers: User[] = [
      {
        id: '1',
        tenantId: tenant?.id || 'tenant_1',
        email: 'admin@school.com',
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        tenantId: tenant?.id || 'tenant_1',
        email: 'teacher1@school.com',
        name: 'John Teacher',
        role: 'teacher',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        tenantId: tenant?.id || 'tenant_1',
        email: 'principal@school.com',
        name: 'Dr. Sarah Principal',
        role: 'principal',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '4',
        tenantId: tenant?.id || 'tenant_1',
        email: 'accountant@school.com',
        name: 'Mike Accountant',
        role: 'accountant',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    setUsers(demoUsers)
    setIsLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [tenant?.id])

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const validateNewUser = (): boolean => {
    const errors: Record<string, string> = {}
    const emailErr = emailError(newUser.email)
    if (emailErr) errors.email = emailErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const validateEditingUser = (): boolean => {
    const errors: Record<string, string> = {}
    const emailErr = emailError(editingUser?.email ?? '')
    if (emailErr) errors.email = emailErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return
    if (!validateNewUser()) return
    setIsSubmitting(true)

    const createdUser: User = {
      id: `user_${Date.now()}`,
      tenantId: tenant?.id || 'tenant_1',
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setUsers([...users, createdUser])
    setNewUser({ name: '', email: '', role: 'teacher', password: '' })
    setIsCreateOpen(false)
    setIsSubmitting(false)
  }

  const handleEditUser = async () => {
    if (!editingUser || !editingUser.name || !editingUser.email) return
    if (!validateEditingUser()) return
    setIsSubmitting(true)

    setUsers(users.map(u => (u.id === editingUser.id ? editingUser : u)))
    setEditingUser(null)
    setIsEditOpen(false)
    setIsSubmitting(false)
  }

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id))
  }

  const handleToggleStatus = (user: User) => {
    setUsers(
      users.map(u =>
        u.id === user.id
          ? { ...u, isActive: !u.isActive, updatedAt: new Date().toISOString() }
          : u
      )
    )
  }

  const openEditDialog = (u: User) => {
    setEditingUser({ ...u })
    setFieldErrors({})
    setIsEditOpen(true)
  }

  const stats = [
    { label: 'Total Accounts', value: users.length, icon: Users },
    { label: 'Active Accounts', value: users.filter(u => u.isActive).length, icon: Check },
    { label: 'Admin Users', value: users.filter(u => ['admin', 'tenant_owner'].includes(u.role)).length, icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts"
        description="Manage staff, admin, and user accounts across the school"
        action={
          canManageAccounts ? (
            <Button onClick={() => { setFieldErrors({}); setIsCreateOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="admin_assistant">Admin Assistant</SelectItem>
                <SelectItem value="principal">Principal</SelectItem>
                <SelectItem value="vice_principal">Vice Principal</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="hr">HR Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>{filteredUsers.length} accounts found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : (
                <>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[u.role]}>
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.isActive ? 'default' : 'secondary'}
                          className={u.isActive ? 'bg-green-500' : 'bg-gray-400'}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {canManageAccounts && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(u)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(u)}>
                                {u.isActive ? (
                                  <>
                                    <X className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No accounts found
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>Add a new user account to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className={fieldErrors.email ? 'border-destructive' : ''}
              />
              {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="admin_assistant">Admin Assistant</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="vice_principal">Vice Principal</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="hr">HR Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="User must change on first login"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update user account details</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className={fieldErrors.email ? 'border-destructive' : ''}
                />
                {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editingUser.role} onValueChange={(value: any) => setEditingUser({ ...editingUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="admin_assistant">Admin Assistant</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="vice_principal">Vice Principal</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="hr">HR Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
