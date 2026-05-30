'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { studentService, parentService } from '@/lib/services'
import type { Student, Parent } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserPlus,
  Eye,
  Link as LinkIcon,
} from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'

export default function StudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isLinkParentOpen, setIsLinkParentOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null)
  const [classes, setClasses] = useState<string[]>([])
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNumber: '',
    className: '',
    section: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male' as Student['gender'],
    address: '',
    admissionDate: new Date().toISOString().split('T')[0],
  })

  const tenantId = user?.tenantId || 'tenant_1'

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    setLoading(true)
    const [studentsData, classesData, parentsData] = await Promise.all([
      studentService.getStudents(tenantId),
      studentService.getClasses(tenantId),
      parentService.getParents(tenantId),
    ])
    setStudents(studentsData)
    setClasses(classesData)
    setParents(parentsData)
    setLoading(false)
  }

  const handleCreateStudent = async () => {
    if (!newStudent.name || !newStudent.rollNumber || !newStudent.className) return

    await studentService.createStudent({
      ...newStudent,
      tenantId,
      status: 'active',
    })

    setNewStudent({
      name: '',
      rollNumber: '',
      className: '',
      section: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: 'male',
      address: '',
      admissionDate: new Date().toISOString().split('T')[0],
    })
    setIsCreateOpen(false)
    loadData()
  }

  const handleLinkParent = async () => {
    if (!selectedStudent || !selectedParent) return
    
    await parentService.linkStudentToParent(selectedParent.id, selectedStudent.id)
    setIsLinkParentOpen(false)
    setSelectedParent(null)
    loadData()
    
    // Refresh the selected student view
    const updated = await studentService.getStudent(selectedStudent.id)
    setSelectedStudent(updated)
  }

  const handleUnlinkParent = async (studentId: string, parentId: string) => {
    await parentService.unlinkStudentFromParent(parentId, studentId)
    loadData()
    
    // Refresh the selected student view
    if (selectedStudent?.id === studentId) {
      const updated = await studentService.getStudent(studentId)
      setSelectedStudent(updated)
    }
  }

  const getStudentParent = (studentId: string) => {
    return parents.find(p => p.studentIds.includes(studentId))
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClass = filterClass === 'all' || student.className === filterClass
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus
    return matchesSearch && matchesClass && matchesStatus
  })

  const getStatusColor = (status: Student['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-200'
      case 'inactive': return 'bg-gray-500/10 text-gray-600 border-gray-200'
      case 'graduated': return 'bg-blue-500/10 text-blue-600 border-blue-200'
      case 'transferred': return 'bg-orange-500/10 text-orange-600 border-orange-200'
      default: return ''
    }
  }

  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    inactive: students.filter(s => s.status === 'inactive').length,
    byClass: classes.map(c => ({
      name: c,
      count: students.filter(s => s.className === c).length
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground">Manage students and their information</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{classes.length}</p>
                <p className="text-sm text-muted-foreground">Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {students.filter(s => s.parentId).length}
                </p>
                <p className="text-sm text-muted-foreground">With Parents Linked</p>
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
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll No.</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const parent = getStudentParent(student.id)
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{student.name}</p>
                          {student.email && (
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{student.rollNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.className}</p>
                        {student.section && (
                          <p className="text-xs text-muted-foreground">Section {student.section}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {parent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" title="Parent Linked" />
                          <span className="text-sm">{parent.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.phone && (
                        <p className="text-sm">{student.phone}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
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
                            setSelectedStudent(student)
                            setIsViewOpen(true)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedStudent(student)
                            setIsLinkParentOpen(true)
                          }}>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Link Parent
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Student Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Enter student details to add them to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Student name"
                />
              </div>
              <div className="space-y-2">
                <Label>Roll Number *</Label>
                <Input
                  value={newStudent.rollNumber}
                  onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                  placeholder="Roll number"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select
                  value={newStudent.className}
                  onValueChange={(v) => setNewStudent({ ...newStudent, className: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={newStudent.section}
                  onValueChange={(v) => setNewStudent({ ...newStudent, section: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="C">Section C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={newStudent.gender}
                  onValueChange={(v) => setNewStudent({ ...newStudent, gender: v as Student['gender'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="student@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={newStudent.dateOfBirth}
                  onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Admission Date</Label>
                <Input
                  type="date"
                  value={newStudent.admissionDate}
                  onChange={(e) => setNewStudent({ ...newStudent, admissionDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newStudent.address}
                onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStudent}>
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Student Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(selectedStudent.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{selectedStudent.name}</DialogTitle>
                    <DialogDescription>
                      {selectedStudent.className} {selectedStudent.section && `- Section ${selectedStudent.section}`}
                    </DialogDescription>
                    <Badge variant="outline" className={`mt-1 ${getStatusColor(selectedStudent.status)}`}>
                      {selectedStudent.status}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList>
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="parent">Parent/Guardian</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Roll Number</p>
                      <p className="font-medium font-mono">{selectedStudent.rollNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Admission Date</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(selectedStudent.admissionDate)}
                      </p>
                    </div>
                    {selectedStudent.dateOfBirth && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{formatDate(selectedStudent.dateOfBirth)}</p>
                      </div>
                    )}
                    {selectedStudent.gender && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{selectedStudent.gender}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium">Contact Information</h4>
                    {selectedStudent.email && (
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedStudent.email}
                      </p>
                    )}
                    {selectedStudent.phone && (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedStudent.phone}
                      </p>
                    )}
                    {selectedStudent.address && (
                      <p className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedStudent.address}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="parent" className="space-y-4 mt-4">
                  {(() => {
                    const parent = getStudentParent(selectedStudent.id)
                    if (parent) {
                      return (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarFallback className="bg-blue-500/10 text-blue-600">
                                    {getInitials(parent.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{parent.name}</p>
                                  <p className="text-sm text-muted-foreground capitalize">{parent.relation}</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnlinkParent(selectedStudent.id, parent.id)}
                              >
                                Unlink
                              </Button>
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                              <p className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {parent.email}
                              </p>
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                {parent.phone}
                              </p>
                              {parent.canLogin && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                  Portal Access Enabled
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                    return (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground mb-4">No parent/guardian linked</p>
                        <Button onClick={() => setIsLinkParentOpen(true)}>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Link Parent
                        </Button>
                      </div>
                    )
                  })()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Link Parent Dialog */}
      <Dialog open={isLinkParentOpen} onOpenChange={setIsLinkParentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Parent/Guardian</DialogTitle>
            <DialogDescription>
              Select an existing parent or create a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Parent</Label>
              <Select
                value={selectedParent?.id || ''}
                onValueChange={(v) => {
                  const p = parents.find(p => p.id === v)
                  setSelectedParent(p || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a parent..." />
                </SelectTrigger>
                <SelectContent>
                  {parents.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground text-xs capitalize">({p.relation})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedParent && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(selectedParent.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedParent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedParent.email} | {selectedParent.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedParent.studentIds.length} student(s) linked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkParentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkParent} disabled={!selectedParent}>
              Link Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
