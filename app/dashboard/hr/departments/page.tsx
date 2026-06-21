'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import type { Department } from '@/lib/services/hr'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, Building2 } from 'lucide-react'

const EMPTY_FORM = { name: '', code: '', description: '', headOfDepartmentId: '', sortOrder: '' }

export default function DepartmentsPage() {
  const { can } = useAuth()

  const [departments, setDepartments] = useState<Department[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await hrService.getDepartments({ limit: 200, search: search || undefined })
      setDepartments(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load departments.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => { loadData() }, [loadData])

  if (!can('hr.department.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError('')
    setDialogOpen(true)
  }

  const openEdit = (dept: Department) => {
    setEditing(dept)
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description ?? '',
      headOfDepartmentId: dept.head_of_department_id ?? '',
      sortOrder: dept.sort_order != null ? String(dept.sort_order) : '',
    })
    setSubmitError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      headOfDepartmentId: form.headOfDepartmentId.trim() || undefined,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    }

    const result = editing
      ? await hrService.updateDepartment(editing.id, payload)
      : await hrService.createDepartment(payload)

    if (result.error || !result.department) {
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
    await hrService.deleteDepartment(deleteConfirm.id)
    setDeleteConfirm(null)
    setIsDeleting(false)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage organisational departments"
        action={
          can('hr.department.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Department
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Departments ({total})</CardTitle>
          <div className="relative max-w-sm mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
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
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No departments found
                    </TableCell>
                  </TableRow>
                )}
                {departments.map(dept => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-semibold">{dept.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{dept.code}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {dept.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{dept.sort_order ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('hr.department.update') && (
                            <DropdownMenuItem onClick={() => openEdit(dept)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {can('hr.department.delete') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteConfirm(dept)} className="text-destructive">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.name}` : 'Create a new organisational department.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label>Department Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mathematics Department"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. MATH"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Head of Department ID (optional)</Label>
              <Input
                value={form.headOfDepartmentId}
                onChange={e => setForm(f => ({ ...f, headOfDepartmentId: e.target.value }))}
                placeholder="Employee UUID"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Sort Order (optional)</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim() || !form.code.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
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
    </div>
  )
}
