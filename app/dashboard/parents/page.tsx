'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { ParentFormDialog } from '@/components/parents/parent-form-dialog'
import { parentService, type Parent, type LinkedStudent } from '@/lib/services/parent'
import { studentService, type StudentDropdownItem } from '@/lib/services/student'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, Users, Eye, UserPlus } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const RELATIONSHIPS = ['father', 'mother', 'guardian']

export default function ParentsPage() {
  const { can } = useAuth()

  const [parents, setParents] = useState<Parent[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Parent | null>(null)

  const [viewing, setViewing] = useState<Parent | null>(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [studentsDropdown, setStudentsDropdown] = useState<StudentDropdownItem[]>([])

  const [linkStudentId, setLinkStudentId] = useState('')
  const [linkRelationship, setLinkRelationship] = useState('father')
  const [linkIsPrimary, setLinkIsPrimary] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [linkError, setLinkError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Parent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await parentService.getParents({ limit: 100, search: search || undefined })
      setParents(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load parents.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => { loadData() }, [loadData])

  if (!can('parents.parent.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (parent: Parent) => {
    setEditing(parent)
    setDialogOpen(true)
  }

  const openView = async (parent: Parent) => {
    setViewing(parent)
    setIsViewLoading(true)
    setLinkError('')
    setLinkStudentId('')
    setLinkRelationship('father')
    setLinkIsPrimary(false)
    const [full, students, dropdown] = await Promise.all([
      parentService.getParent(parent.id),
      parentService.getLinkedStudents(parent.id).catch(() => []),
      studentsDropdown.length > 0 ? Promise.resolve(studentsDropdown) : studentService.getStudentsDropdown(),
    ])
    if (full) setViewing(full)
    setLinkedStudents(students)
    setStudentsDropdown(dropdown)
    setIsViewLoading(false)
  }

  const reloadLinkedStudents = async (parentId: string) => {
    const students = await parentService.getLinkedStudents(parentId).catch(() => [])
    setLinkedStudents(students)
  }

  const handleLinkStudent = async () => {
    if (!viewing || !linkStudentId || !linkRelationship) return
    setIsLinking(true)
    setLinkError('')
    const result = await parentService.linkStudent(viewing.id, {
      studentId: linkStudentId,
      relationship: linkRelationship,
      isPrimary: linkIsPrimary,
    })
    setIsLinking(false)
    if (result.error) { setLinkError(result.error); return }
    setLinkStudentId('')
    setLinkIsPrimary(false)
    await reloadLinkedStudents(viewing.id)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    const { error } = await parentService.deleteParent(deleteTarget.id)
    setIsDeleting(false)
    if (error) { setDeleteError(error); return }
    setDeleteTarget(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parents"
        description="Guardian accounts linked to student profiles"
        action={
          can('parents.parent.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Parent
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Parents ({total})</CardTitle>
          <div className="relative max-w-sm mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadError && (
            <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Emergency Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : (
                <>
                  {parents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No parents found
                      </TableCell>
                    </TableRow>
                  )}
                  {parents.map(parent => (
                    <TableRow key={parent.id}>
                      <TableCell className="font-semibold">{parent.firstName} {parent.lastName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{parent.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{parent.phone}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{parent.occupation ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={parent.isEmergencyContact ? 'default' : 'secondary'}>
                          {parent.isEmergencyContact ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(parent)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {can('parents.parent.update') && (
                              <DropdownMenuItem onClick={() => openEdit(parent)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {can('parents.parent.delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setDeleteTarget(parent); setDeleteError('') }} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ParentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={loadData}
      />

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.firstName} {viewing?.lastName}</DialogTitle>
            <DialogDescription>{viewing?.email} · {viewing?.phone}</DialogDescription>
          </DialogHeader>
          {isViewLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">CNIC</p>
                  <p className="font-medium">{viewing?.cnic ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Occupation</p>
                  <p className="font-medium">{viewing?.occupation ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{viewing?.address ?? '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Linked Students</p>
                {linkedStudents.length > 0 ? (
                  <div className="space-y-2">
                    {linkedStudents.map(child => (
                      <div key={child.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
                        <span>
                          {child.firstName} {child.lastName}
                          {child.admissionNumber && (
                            <span className="ml-2 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{child.admissionNumber}</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          {child.relationship && <Badge variant="secondary" className="capitalize">{child.relationship}</Badge>}
                          {child.isPrimary && <Badge>Primary</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No students linked yet.</p>
                )}
              </div>

              {can('parents.parent.link_student') && (
                <div className="rounded-lg border p-3 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Link a Student</p>
                  {linkError && <Alert variant="destructive"><AlertDescription>{linkError}</AlertDescription></Alert>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Student</p>
                      <Combobox
                        value={linkStudentId}
                        onValueChange={setLinkStudentId}
                        options={studentsDropdown
                          .filter(s => !linkedStudents.some(ls => ls.id === s.id))
                          .map(s => ({ value: s.id, label: s.admissionNumber ? `${s.name} (${s.admissionNumber})` : s.name }))}
                        placeholder="Select student"
                        searchPlaceholder="Search students…"
                        emptyText="No students found."
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Relationship</p>
                      <Select value={linkRelationship} onValueChange={setLinkRelationship}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIPS.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={linkIsPrimary} onCheckedChange={setLinkIsPrimary} />
                      <span className="text-sm">Primary guardian for this student</span>
                    </div>
                    <Button size="sm" onClick={handleLinkStudent} disabled={isLinking || !linkStudentId}>
                      {isLinking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Link Student
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.firstName} {deleteTarget?.lastName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <Alert variant="destructive"><AlertDescription>{deleteError}</AlertDescription></Alert>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
