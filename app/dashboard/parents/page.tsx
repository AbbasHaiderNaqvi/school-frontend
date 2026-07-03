'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { parentService, studentService } from '@/lib/services'
import type { Parent, Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  Eye,
  Key,
  KeyRound,
  UserCheck,
  UserX,
  LogIn,
  Link as LinkIcon,
  Unlink,
  Briefcase,
} from 'lucide-react'
import { formatDate, formatDateTime, getInitials } from '@/lib/utils'
import { StatsTablePageSkeleton } from '@/components/ui/page-skeleton'

export default function ParentsPage() {
  const { user } = useAuth()
  const [parents, setParents] = useState<Parent[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLoginAccess, setFilterLoginAccess] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isLinkStudentOpen, setIsLinkStudentOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [stats, setStats] = useState({
    total: 0,
    withLogin: 0,
    withoutLogin: 0,
    activeLastWeek: 0,
    multipleChildren: 0,
  })
  
  const [newParent, setNewParent] = useState({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    occupation: '',
    address: '',
    relation: 'father' as Parent['relation'],
    canLogin: false,
  })

  const tenantId = user?.tenantId || 'tenant_1'

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    setLoading(true)
    const [parentsData, studentsData, statsData] = await Promise.all([
      parentService.getParents(tenantId),
      studentService.getStudents(tenantId),
      parentService.getParentStats(tenantId),
    ])
    setParents(parentsData)
    setStudents(studentsData)
    setStats(statsData)
    setLoading(false)
  }

  const handleCreateParent = async () => {
    if (!newParent.name || !newParent.email || !newParent.phone) return

    await parentService.createParent({
      ...newParent,
      tenantId,
      studentIds: [],
      isActive: true,
      userId: newParent.canLogin ? `parent_user_${Date.now()}` : undefined,
    })

    setNewParent({
      name: '',
      email: '',
      phone: '',
      alternatePhone: '',
      occupation: '',
      address: '',
      relation: 'father',
      canLogin: false,
    })
    setIsCreateOpen(false)
    loadData()
  }

  const handleToggleLoginAccess = async (parentId: string) => {
    await parentService.toggleLoginAccess(parentId)
    loadData()
    
    if (selectedParent?.id === parentId) {
      const updated = await parentService.getParent(parentId)
      setSelectedParent(updated)
    }
  }

  const handleLinkStudent = async () => {
    if (!selectedParent || !selectedStudentId) return
    
    await parentService.linkStudentToParent(selectedParent.id, selectedStudentId)
    setIsLinkStudentOpen(false)
    setSelectedStudentId('')
    loadData()
    
    const updated = await parentService.getParent(selectedParent.id)
    setSelectedParent(updated)
  }

  const handleUnlinkStudent = async (studentId: string) => {
    if (!selectedParent) return
    
    await parentService.unlinkStudentFromParent(selectedParent.id, studentId)
    loadData()
    
    const updated = await parentService.getParent(selectedParent.id)
    setSelectedParent(updated)
  }

  const handleDeleteParent = async (parentId: string) => {
    if (confirm('Are you sure you want to delete this parent? This will unlink all associated students.')) {
      await parentService.deleteParent(parentId)
      setIsViewOpen(false)
      setSelectedParent(null)
      loadData()
    }
  }

  const getParentStudents = (parent: Parent): Student[] => {
    return students.filter(s => parent.studentIds.includes(s.id))
  }

  const getUnlinkedStudents = (): Student[] => {
    const linkedStudentIds = new Set(parents.flatMap(p => p.studentIds))
    return students.filter(s => !linkedStudentIds.has(s.id))
  }

  const filteredParents = parents.filter(parent => {
    const matchesSearch = 
      parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.phone.includes(searchQuery)
    const matchesLoginFilter = 
      filterLoginAccess === 'all' ||
      (filterLoginAccess === 'with' && parent.canLogin) ||
      (filterLoginAccess === 'without' && !parent.canLogin)
    return matchesSearch && matchesLoginFilter
  })

  if (loading) {
    return <StatsTablePageSkeleton statCount={3} />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parent Management</h1>
          <p className="text-muted-foreground">Manage parents/guardians and their portal access</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Parent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Parents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.withLogin}</p>
                <p className="text-sm text-muted-foreground">With Portal Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <UserX className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.withoutLogin}</p>
                <p className="text-sm text-muted-foreground">No Portal Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <LogIn className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.activeLastWeek}</p>
                <p className="text-sm text-muted-foreground">Active (7 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.multipleChildren}</p>
                <p className="text-sm text-muted-foreground">Multiple Children</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterLoginAccess} onValueChange={setFilterLoginAccess}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Portal Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parents</SelectItem>
                <SelectItem value="with">With Portal Access</SelectItem>
                <SelectItem value="without">Without Portal Access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Parents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parents ({filteredParents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent</TableHead>
                <TableHead>Relation</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Portal Access</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParents.map((parent) => {
                const children = getParentStudents(parent)
                return (
                  <TableRow key={parent.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(parent.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{parent.name}</p>
                          <p className="text-xs text-muted-foreground">{parent.occupation || 'N/A'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{parent.relation}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {children.length > 0 ? (
                          children.map(child => (
                            <Badge key={child.id} variant="secondary" className="text-xs">
                              {child.name.split(' ')[0]} ({child.className})
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No children linked</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {parent.phone}
                        </p>
                        <p className="text-xs text-muted-foreground">{parent.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={parent.canLogin}
                          onCheckedChange={() => handleToggleLoginAccess(parent.id)}
                        />
                        {parent.canLogin ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {parent.lastLogin ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(parent.lastLogin)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedParent(parent)
                            setIsViewOpen(true)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedParent(parent)
                            setIsLinkStudentOpen(true)
                          }}>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Link Student
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleLoginAccess(parent.id)}>
                            {parent.canLogin ? (
                              <>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Disable Portal Access
                              </>
                            ) : (
                              <>
                                <Key className="h-4 w-4 mr-2" />
                                Enable Portal Access
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteParent(parent.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredParents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No parents found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Parent Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Parent</DialogTitle>
            <DialogDescription>Enter parent/guardian details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={newParent.name}
                  onChange={(e) => setNewParent({ ...newParent, name: e.target.value })}
                  placeholder="Parent name"
                />
              </div>
              <div className="space-y-2">
                <Label>Relation *</Label>
                <Select
                  value={newParent.relation}
                  onValueChange={(v) => setNewParent({ ...newParent, relation: v as Parent['relation'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newParent.email}
                  onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
                  placeholder="parent@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={newParent.phone}
                  onChange={(e) => setNewParent({ ...newParent, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alternate Phone</Label>
                <Input
                  value={newParent.alternatePhone}
                  onChange={(e) => setNewParent({ ...newParent, alternatePhone: e.target.value })}
                  placeholder="Alternate phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input
                  value={newParent.occupation}
                  onChange={(e) => setNewParent({ ...newParent, occupation: e.target.value })}
                  placeholder="Occupation"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newParent.address}
                onChange={(e) => setNewParent({ ...newParent, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Portal Access</p>
                <p className="text-sm text-muted-foreground">Allow parent to log in to the portal</p>
              </div>
              <Switch
                checked={newParent.canLogin}
                onCheckedChange={(v) => setNewParent({ ...newParent, canLogin: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateParent}>
              Add Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Parent Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedParent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(selectedParent.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{selectedParent.name}</DialogTitle>
                    <DialogDescription className="capitalize">
                      {selectedParent.relation}
                    </DialogDescription>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedParent.canLogin ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                          Portal Access Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
                          Portal Access Disabled
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList>
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="children">
                    Children
                    <Badge variant="secondary" className="ml-2">
                      {selectedParent.studentIds.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="account">Account</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedParent.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedParent.phone}
                      </p>
                    </div>
                    {selectedParent.alternatePhone && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Alternate Phone</p>
                        <p className="font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {selectedParent.alternatePhone}
                        </p>
                      </div>
                    )}
                    {selectedParent.occupation && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Occupation</p>
                        <p className="font-medium flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {selectedParent.occupation}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedParent.address && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedParent.address}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="children" className="space-y-4 mt-4">
                  {/* Linked Children */}
                  {getParentStudents(selectedParent).length > 0 ? (
                    <div className="space-y-2">
                      {getParentStudents(selectedParent).map(student => (
                        <Card key={student.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-blue-500/10 text-blue-600">
                                    {getInitials(student.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {student.className} | Roll: {student.rollNumber}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnlinkStudent(student.id)}
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Unlink
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No children linked to this parent
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent"
                    onClick={() => setIsLinkStudentOpen(true)}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Another Student
                  </Button>
                </TabsContent>

                <TabsContent value="account" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Portal Access</p>
                          <p className="text-sm text-muted-foreground">
                            Allow parent to log in to the parent portal
                          </p>
                        </div>
                        <Switch
                          checked={selectedParent.canLogin}
                          onCheckedChange={() => handleToggleLoginAccess(selectedParent.id)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {selectedParent.canLogin && (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Account Status</p>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                            Active
                          </Badge>
                        </div>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">User ID</span>
                            <span className="font-mono">{selectedParent.userId || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Login</span>
                            <span>
                              {selectedParent.lastLogin 
                                ? formatDateTime(selectedParent.lastLogin) 
                                : 'Never'}
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <Button variant="outline" size="sm" className="w-full bg-transparent">
                            <Key className="h-4 w-4 mr-2" />
                            Reset Password
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Link Student Dialog */}
      <Dialog open={isLinkStudentOpen} onOpenChange={setIsLinkStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Student</DialogTitle>
            <DialogDescription>
              Select a student to link to {selectedParent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students
                    .filter(s => !selectedParent?.studentIds.includes(s.id))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({s.className} - {s.rollNumber})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStudentId && (
              <Card>
                <CardContent className="p-3">
                  {(() => {
                    const student = students.find(s => s.id === selectedStudentId)
                    if (!student) return null
                    return (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.className} | Roll: {student.rollNumber}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkStudentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkStudent} disabled={!selectedStudentId}>
              Link Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
