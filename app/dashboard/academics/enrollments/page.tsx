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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  academicsService, type Enrollment, type EnrollmentStatus, type AcademicClass, type AcademicSection,
} from '@/lib/services/academics'
import { studentService, type StudentDropdownItem } from '@/lib/services/student'
import { Plus, Loader2, RefreshCw, ListChecks, ArrowUpCircle, History } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const ALL = '__all__'
const NONE = '__none__'
const STATUSES: EnrollmentStatus[] = ['active', 'promoted', 'withdrawn', 'transferred', 'completed']

function statusBadgeVariant(status: EnrollmentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'active') return 'default'
  if (status === 'withdrawn' || status === 'transferred') return 'destructive'
  if (status === 'completed') return 'outline'
  return 'secondary'
}

function studentLabel(s: StudentDropdownItem): string {
  return s.admissionNumber ? `${s.name} (${s.admissionNumber})` : s.name
}

export default function EnrollmentsPage() {
  const { can } = useAuth()

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [total, setTotal] = useState(0)
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [students, setStudents] = useState<StudentDropdownItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [classFilter, setClassFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | 'all'>('all')

  // Create enrollment dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [sections, setSections] = useState<AcademicSection[]>([])
  const [form, setForm] = useState({ studentId: '', classId: '', sectionId: '', academicYear: '', rollNumber: '', notes: '' })

  // Promote dialog
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [promoteError, setPromoteError] = useState('')
  const [promoteResult, setPromoteResult] = useState<{ promoted: number; created: number; skipped: number } | null>(null)
  const [promoteSections, setPromoteSections] = useState<AcademicSection[]>([])
  const [promoteForm, setPromoteForm] = useState({ classId: '', academicYear: '', targetClassId: '', targetAcademicYear: '', targetSectionId: '' })

  // History dialog
  const [historyStudent, setHistoryStudent] = useState<{ id: string; name: string } | null>(null)
  const [history, setHistory] = useState<Enrollment[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const loadDropdowns = useCallback(async () => {
    const [classesResult, studentsResult] = await Promise.all([
      academicsService.getClasses({ limit: 200 }),
      studentService.getStudentsDropdown(),
    ])
    setClasses(classesResult.data)
    setStudents(studentsResult)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await academicsService.getEnrollments({
        limit: 100,
        classId: classFilter || undefined,
        academicYear: yearFilter || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      setEnrollments(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load enrollments.')
    } finally {
      setIsLoading(false)
    }
  }, [classFilter, yearFilter, statusFilter])

  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useEffect(() => { loadData() }, [loadData])

  if (!can('academics.enrollment.read')) return <AccessDenied />

  const openCreate = () => {
    setForm({ studentId: '', classId: '', sectionId: '', academicYear: '', rollNumber: '', notes: '' })
    setSections([])
    setSubmitError('')
    setDialogOpen(true)
  }

  const handleClassChange = async (classId: string) => {
    setForm(f => ({ ...f, classId, sectionId: '' }))
    if (!classId) { setSections([]); return }
    const result = await academicsService.getSections({ classId, limit: 100 })
    setSections(result.data)
  }

  const isValid = form.studentId && form.classId && form.academicYear.trim()

  const handleSave = async () => {
    if (!isValid) return
    setIsSubmitting(true)
    setSubmitError('')

    const result = await academicsService.createEnrollment({
      studentId: form.studentId,
      classId: form.classId,
      sectionId: form.sectionId || undefined,
      academicYear: form.academicYear.trim(),
      rollNumber: form.rollNumber.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Failed to create enrollment')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const openPromote = () => {
    setPromoteForm({ classId: '', academicYear: '', targetClassId: '', targetAcademicYear: '', targetSectionId: '' })
    setPromoteSections([])
    setPromoteError('')
    setPromoteResult(null)
    setPromoteOpen(true)
  }

  const handlePromoteTargetClassChange = async (targetClassId: string) => {
    setPromoteForm(f => ({ ...f, targetClassId, targetSectionId: '' }))
    if (!targetClassId) { setPromoteSections([]); return }
    const result = await academicsService.getSections({ classId: targetClassId, limit: 100 })
    setPromoteSections(result.data)
  }

  const isPromoteValid =
    promoteForm.classId && promoteForm.academicYear.trim() && promoteForm.targetClassId && promoteForm.targetAcademicYear.trim()

  const handlePromote = async () => {
    if (!isPromoteValid) return
    setIsPromoting(true)
    setPromoteError('')
    setPromoteResult(null)

    const result = await academicsService.promoteEnrollments({
      classId: promoteForm.classId,
      academicYear: promoteForm.academicYear.trim(),
      targetClassId: promoteForm.targetClassId,
      targetAcademicYear: promoteForm.targetAcademicYear.trim(),
      targetSectionId: promoteForm.targetSectionId || undefined,
    })

    setIsPromoting(false)
    if (result.error || !result.data) {
      setPromoteError(result.error || 'Failed to promote enrollments')
      return
    }
    setPromoteResult(result.data)
    loadData()
  }

  const openHistory = async (enrollment: Enrollment) => {
    const name = enrollment.studentName ?? enrollment.studentId
    setHistoryStudent({ id: enrollment.studentId, name })
    setIsHistoryLoading(true)
    try {
      const rows = await academicsService.getEnrollmentHistory(enrollment.studentId)
      setHistory(rows)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        description="Places a student profile into one class for one academic year"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {can('academics.enrollment.create') && (
              <>
                <Button variant="outline" onClick={openPromote}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" /> Promote Class
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> New Enrollment
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Enrollments ({total})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Combobox
              value={classFilter || ALL}
              onValueChange={v => setClassFilter(v === ALL ? '' : v)}
              options={[
                { value: ALL, label: 'All Classes' },
                ...classes.map(c => ({ value: c.id, label: c.name })),
              ]}
              placeholder="All Classes"
              searchPlaceholder="Search classes…"
              emptyText="No classes found."
              className="w-full sm:w-56"
            />
            <Input
              placeholder="Academic Year (e.g. 2025-2026)"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="w-full sm:w-56"
            />
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as EnrollmentStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Roll No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : (
                <>
                  {enrollments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <ListChecks className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No enrollments found
                      </TableCell>
                    </TableRow>
                  )}
                  {enrollments.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        {e.studentName ?? e.studentId}
                        {e.studentCode && <span className="text-muted-foreground font-normal"> ({e.studentCode})</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.className ?? classes.find(c => c.id === e.classId)?.name ?? e.classId}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.sectionName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.academicYear}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.rollNumber ?? '—'}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(e.status)}>{e.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openHistory(e)} title="History">
                          <History className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Enrollment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Enrollment</DialogTitle>
            <DialogDescription>Enroll a student profile into a class for an academic year</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4">
            <div>
              <Label>Student <span className="text-destructive">*</span></Label>
              <Combobox
                value={form.studentId}
                onValueChange={v => setForm(f => ({ ...f, studentId: v }))}
                options={students.map(s => ({ value: s.id, label: studentLabel(s) }))}
                placeholder="Select student"
                searchPlaceholder="Search students…"
                emptyText="No students found."
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Class <span className="text-destructive">*</span></Label>
                <Combobox
                  value={form.classId}
                  onValueChange={handleClassChange}
                  options={classes.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select class"
                  searchPlaceholder="Search classes…"
                  emptyText="No classes found."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Section (optional)</Label>
                <Combobox
                  value={form.sectionId || NONE}
                  onValueChange={v => setForm(f => ({ ...f, sectionId: v === NONE ? '' : v }))}
                  options={[
                    { value: NONE, label: 'None' },
                    ...sections.map(s => ({ value: s.id, label: s.name })),
                  ]}
                  placeholder="None"
                  searchPlaceholder="Search sections…"
                  emptyText="No sections found."
                  disabled={!form.classId}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Academic Year <span className="text-destructive">*</span></Label>
                <Input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025-2026" className="mt-1" />
              </div>
              <div>
                <Label>Roll Number (optional)</Label>
                <Input value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Class</DialogTitle>
            <DialogDescription>Bulk-roll every active enrollment in a class/year to a new class/year. Idempotent — safe to re-run.</DialogDescription>
          </DialogHeader>
          {promoteError && <Alert variant="destructive"><AlertDescription>{promoteError}</AlertDescription></Alert>}
          {promoteResult && (
            <Alert>
              <AlertDescription>
                Promoted {promoteResult.promoted}, created {promoteResult.created}, skipped {promoteResult.skipped} (already promoted).
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">From</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Class <span className="text-destructive">*</span></Label>
                <Combobox
                  value={promoteForm.classId}
                  onValueChange={v => setPromoteForm(f => ({ ...f, classId: v }))}
                  options={classes.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select class"
                  searchPlaceholder="Search classes…"
                  emptyText="No classes found."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Academic Year <span className="text-destructive">*</span></Label>
                <Input value={promoteForm.academicYear} onChange={e => setPromoteForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025-2026" className="mt-1" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">To</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Target Class <span className="text-destructive">*</span></Label>
                <Combobox
                  value={promoteForm.targetClassId}
                  onValueChange={handlePromoteTargetClassChange}
                  options={classes.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select class"
                  searchPlaceholder="Search classes…"
                  emptyText="No classes found."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Target Academic Year <span className="text-destructive">*</span></Label>
                <Input value={promoteForm.targetAcademicYear} onChange={e => setPromoteForm(f => ({ ...f, targetAcademicYear: e.target.value }))} placeholder="2026-2027" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Target Section (optional)</Label>
              <Combobox
                value={promoteForm.targetSectionId || NONE}
                onValueChange={v => setPromoteForm(f => ({ ...f, targetSectionId: v === NONE ? '' : v }))}
                options={[
                  { value: NONE, label: 'None' },
                  ...promoteSections.map(s => ({ value: s.id, label: s.name })),
                ]}
                placeholder="None"
                searchPlaceholder="Search sections…"
                emptyText="No sections found."
                disabled={!promoteForm.targetClassId}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)} disabled={isPromoting}>Close</Button>
            <Button onClick={handlePromote} disabled={isPromoting || !isPromoteValid}>
              {isPromoting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyStudent} onOpenChange={open => !open && setHistoryStudent(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Enrollment History — {historyStudent?.name}</DialogTitle>
            <DialogDescription>Every enrollment ever recorded for this student</DialogDescription>
          </DialogHeader>
          {isHistoryLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No history found</TableCell>
                  </TableRow>
                )}
                {history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>{h.className ?? classes.find(c => c.id === h.classId)?.name ?? h.classId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{h.sectionName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{h.academicYear}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{h.rollNumber ?? '—'}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(h.status)}>{h.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
