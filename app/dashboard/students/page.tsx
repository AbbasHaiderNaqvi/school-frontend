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
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ParentFormDialog } from '@/components/parents/parent-form-dialog'
import { studentService, type Student, type StudentGender, type CreateStudentRequest } from '@/lib/services/student'
import { parentService, type ParentDropdownItem, type Parent } from '@/lib/services/parent'
import { emailError, numberError, requiredError, hasNoErrors } from '@/lib/validation'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, GraduationCap, Eye, UserPlus } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const RELATIONSHIPS = ['FATHER', 'MOTHER', 'GUARDIAN']
const GENDERS: StudentGender[] = ['MALE', 'FEMALE', 'OTHER']

const EMPTY_FORM = {
  firstName: '', lastName: '', admissionDate: new Date().toISOString().slice(0, 10),
  gender: '' as StudentGender | '', dateOfBirth: '', bloodGroup: '', nationality: '', address: '',
  medicalNotes: '', previousSchool: '', email: '', grNumber: '', enrollmentNo: '',
  guardianIncome: '', householdIncome: '', familyMembersCount: '',
}

const EMPTY_GUARDIAN = { parentUserId: '', relationship: 'FATHER' }

export default function StudentsPage() {
  const { can } = useAuth()

  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [parents, setParents] = useState<ParentDropdownItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [guardian, setGuardian] = useState(EMPTY_GUARDIAN)

  const [newParentDialogOpen, setNewParentDialogOpen] = useState(false)

  const [viewing, setViewing] = useState<Student | null>(null)
  const [isViewLoading, setIsViewLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadParents = useCallback(async () => {
    const dropdown = await parentService.getParentsDropdown()
    setParents(dropdown)
    return dropdown
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await studentService.getStudents({ limit: 100, search: search || undefined })
      setStudents(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load students.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => { loadParents() }, [loadParents])
  useEffect(() => { loadData() }, [loadData])

  if (!can('students.student.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setGuardian(EMPTY_GUARDIAN)
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openEdit = (student: Student) => {
    setEditing(student)
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      admissionDate: student.admissionDate?.slice(0, 10) ?? '',
      gender: student.gender ?? '',
      dateOfBirth: student.dateOfBirth ?? '',
      bloodGroup: student.bloodGroup ?? '',
      nationality: student.nationality ?? '',
      address: student.address ?? '',
      medicalNotes: student.medicalNotes ?? '',
      previousSchool: student.previousSchool ?? '',
      email: student.email ?? '',
      grNumber: student.grNumber ?? '',
      enrollmentNo: student.enrollmentNo ?? '',
      guardianIncome: student.guardianIncome ?? '',
      householdIncome: student.householdIncome ?? '',
      familyMembersCount: student.familyMembersCount != null ? String(student.familyMembersCount) : '',
    })
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openView = async (student: Student) => {
    setViewing(student)
    setIsViewLoading(true)
    const full = await studentService.getStudent(student.id)
    if (full) setViewing(full)
    setIsViewLoading(false)
  }

  const handleParentCreated = async (parent: Parent) => {
    await loadParents()
    setGuardian(g => ({ ...g, parentUserId: parent.id }))
  }

  const isValid =
    form.firstName.trim() && form.lastName.trim() && form.admissionDate &&
    (!!editing || guardian.parentUserId)

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const firstNameErr = requiredError(form.firstName, 'First name')
    if (firstNameErr) errors.firstName = firstNameErr
    const lastNameErr = requiredError(form.lastName, 'Last name')
    if (lastNameErr) errors.lastName = lastNameErr
    const emailErr = emailError(form.email, false)
    if (emailErr) errors.email = emailErr
    const guardianIncomeErr = numberError(form.guardianIncome, { min: 0, label: 'Guardian income' })
    if (guardianIncomeErr) errors.guardianIncome = guardianIncomeErr
    const householdIncomeErr = numberError(form.householdIncome, { min: 0, label: 'Household income' })
    if (householdIncomeErr) errors.householdIncome = householdIncomeErr
    const familyMembersErr = numberError(form.familyMembersCount, { min: 0, label: 'Family members' })
    if (familyMembersErr) errors.familyMembersCount = familyMembersErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const basePayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      admissionDate: form.admissionDate,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      bloodGroup: form.bloodGroup.trim() || undefined,
      nationality: form.nationality.trim() || undefined,
      address: form.address.trim() || undefined,
      medicalNotes: form.medicalNotes.trim() || undefined,
      previousSchool: form.previousSchool.trim() || undefined,
      email: form.email.trim() || undefined,
      grNumber: form.grNumber.trim() || undefined,
      enrollmentNo: form.enrollmentNo.trim() || undefined,
      guardianIncome: form.guardianIncome.trim() || undefined,
      householdIncome: form.householdIncome.trim() || undefined,
      familyMembersCount: form.familyMembersCount ? Number(form.familyMembersCount) : undefined,
    }

    const result = editing
      ? await studentService.updateStudent(editing.id, basePayload)
      : await studentService.createStudent({
          ...basePayload,
          guardian: { parentUserId: guardian.parentUserId, relationship: guardian.relationship },
        } as CreateStudentRequest)

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Operation failed')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    const { error } = await studentService.deleteStudent(deleteTarget.id)
    setIsDeleting(false)
    if (error) { setDeleteError(error); return }
    setDeleteTarget(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="The official student register — every enrollment, invoice, and parent link points here"
        action={
          can('students.student.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Students ({total})</CardTitle>
          <div className="relative max-w-sm mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Admission Date</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : (
                <>
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                  {students.map(student => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{student.admissionNumber ?? '—'}</span>
                      </TableCell>
                      <TableCell className="font-semibold">{student.firstName} {student.lastName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm capitalize">{student.gender?.toLowerCase() ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {student.guardian ? `${student.guardian.firstName ?? ''} ${student.guardian.lastName ?? ''}`.trim() || student.guardian.email : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(student)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            {can('students.student.update') && (
                              <DropdownMenuItem onClick={() => openEdit(student)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {can('students.student.delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setDeleteTarget(student); setDeleteError('') }} className="text-destructive">
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Student' : 'Add Student'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.firstName} ${editing.lastName}` : 'Create a new student profile. An admission number is generated automatically.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className={`mt-1 ${fieldErrors.firstName ? 'border-destructive' : ''}`}
                />
                {fieldErrors.firstName && <p className="text-xs text-destructive mt-1">{fieldErrors.firstName}</p>}
              </div>
              <div>
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className={`mt-1 ${fieldErrors.lastName ? 'border-destructive' : ''}`}
                />
                {fieldErrors.lastName && <p className="text-xs text-destructive mt-1">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Admission Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.admissionDate} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender || undefined} onValueChange={v => setForm(f => ({ ...f, gender: v as StudentGender }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {!editing && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Guardian <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewParentDialogOpen(true)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> New Parent
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Parent</Label>
                    <Combobox
                      value={guardian.parentUserId}
                      onValueChange={v => setGuardian(g => ({ ...g, parentUserId: v }))}
                      options={parents.map(p => ({ value: p.id, label: p.name, keywords: p.email }))}
                      placeholder="Select parent"
                      searchPlaceholder="Search parents…"
                      emptyText="No parents found."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Relationship</Label>
                    <Select value={guardian.relationship} onValueChange={v => setGuardian(g => ({ ...g, relationship: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Blood Group</Label>
                <Input value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} placeholder="e.g. B+" className="mt-1" />
              </div>
              <div>
                <Label>Nationality</Label>
                <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={`mt-1 ${fieldErrors.email ? 'border-destructive' : ''}`}
                />
                {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
              </div>
              <div>
                <Label>Previous School</Label>
                <Input value={form.previousSchool} onChange={e => setForm(f => ({ ...f, previousSchool: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Medical Notes</Label>
              <Textarea rows={2} value={form.medicalNotes} onChange={e => setForm(f => ({ ...f, medicalNotes: e.target.value }))} className="mt-1" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>GR Number</Label>
                <Input value={form.grNumber} onChange={e => setForm(f => ({ ...f, grNumber: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Enrollment No.</Label>
                <Input value={form.enrollmentNo} onChange={e => setForm(f => ({ ...f, enrollmentNo: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Guardian Income</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.guardianIncome}
                  onChange={e => setForm(f => ({ ...f, guardianIncome: e.target.value }))}
                  className={`mt-1 ${fieldErrors.guardianIncome ? 'border-destructive' : ''}`}
                />
                {fieldErrors.guardianIncome && <p className="text-xs text-destructive mt-1">{fieldErrors.guardianIncome}</p>}
              </div>
              <div>
                <Label>Household Income</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.householdIncome}
                  onChange={e => setForm(f => ({ ...f, householdIncome: e.target.value }))}
                  className={`mt-1 ${fieldErrors.householdIncome ? 'border-destructive' : ''}`}
                />
                {fieldErrors.householdIncome && <p className="text-xs text-destructive mt-1">{fieldErrors.householdIncome}</p>}
              </div>
              <div>
                <Label>Family Members</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.familyMembersCount}
                  onChange={e => setForm(f => ({ ...f, familyMembersCount: e.target.value }))}
                  className={`mt-1 ${fieldErrors.familyMembersCount ? 'border-destructive' : ''}`}
                />
                {fieldErrors.familyMembersCount && <p className="text-xs text-destructive mt-1">{fieldErrors.familyMembersCount}</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ParentFormDialog
        open={newParentDialogOpen}
        onOpenChange={setNewParentDialogOpen}
        onSaved={handleParentCreated}
      />

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.firstName} {viewing?.lastName}</DialogTitle>
            <DialogDescription>{viewing?.admissionNumber}</DialogDescription>
          </DialogHeader>
          {isViewLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Gender</p><p className="font-medium capitalize">{viewing?.gender?.toLowerCase() ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Date of Birth</p><p className="font-medium">{viewing?.dateOfBirth ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Blood Group</p><p className="font-medium">{viewing?.bloodGroup ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Nationality</p><p className="font-medium">{viewing?.nationality ?? '—'}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Address</p><p className="font-medium">{viewing?.address ?? '—'}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Previous School</p><p className="font-medium">{viewing?.previousSchool ?? '—'}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Medical Notes</p><p className="font-medium">{viewing?.medicalNotes ?? '—'}</p></div>
              <div>
                <p className="text-muted-foreground">Guardian</p>
                <p className="font-medium">
                  {viewing?.guardian
                    ? `${viewing.guardian.firstName ?? ''} ${viewing.guardian.lastName ?? ''}`.trim() || viewing.guardian.email
                    : '—'}
                </p>
                {viewing?.guardian?.relationship && <Badge variant="secondary" className="mt-1">{viewing.guardian.relationship}</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.firstName} {deleteTarget?.lastName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Students with invoices or enrollments cannot be deleted — withdraw their enrollment instead.
            </AlertDialogDescription>
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
