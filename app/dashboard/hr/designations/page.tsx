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
import type { Designation } from '@/lib/services/hr'
import { requiredError, hasNoErrors } from '@/lib/validation'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, Award } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const EMPTY_FORM = { name: '', code: '', description: '', level: '' }

export default function DesignationsPage() {
  const { can } = useAuth()

  const [designations, setDesignations] = useState<Designation[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Designation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState(EMPTY_FORM)

  const [deleteConfirm, setDeleteConfirm] = useState<Designation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const desig = await hrService.getDesignations({ limit: 200, search: search || undefined })
      setDesignations(desig.data)
      setTotal(desig.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load designations.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => { loadData() }, [loadData])

  if (!can('hr.designation.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openEdit = (desig: Designation) => {
    setEditing(desig)
    setForm({
      name: desig.name,
      code: desig.code,
      description: desig.description ?? '',
      level: desig.level ?? '',
    })
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const isValid = form.name.trim() && form.code.trim()

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const nameErr = requiredError(form.name, 'Designation name')
    if (nameErr) errors.name = nameErr
    const codeErr = requiredError(form.code, 'Code')
    if (codeErr) errors.code = codeErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      level: form.level.trim() || undefined,
    }

    const result = editing
      ? await hrService.updateDesignation(editing.id, payload)
      : await hrService.createDesignation(payload)

    if (result.error || !result.designation) {
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
    await hrService.deleteDesignation(deleteConfirm.id)
    setDeleteConfirm(null)
    setIsDeleting(false)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations"
        description="Manage job titles and designation levels"
        action={
          can('hr.designation.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Designation
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Designations ({total})</CardTitle>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search designations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonTableRows rows={5} cols={4} />
                ) : designations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      <Award className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No designations found
                    </TableCell>
                  </TableRow>
                ) : (
                  designations.map(desig => (
                    <TableRow key={desig.id}>
                      <TableCell className="font-semibold">{desig.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{desig.code}</span>
                      </TableCell>
                      <TableCell>
                        {desig.level
                          ? <Badge variant="secondary">{desig.level}</Badge>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('hr.designation.update') && (
                              <DropdownMenuItem onClick={() => openEdit(desig)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {can('hr.designation.delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteConfirm(desig)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Designation' : 'Add Designation'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.name}` : 'Create a new job designation.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label>Designation Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Senior Teacher"
                className={`mt-1 ${fieldErrors.name ? 'border-destructive' : ''}`}
              />
              {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. SR-TCH"
                className={`mt-1 ${fieldErrors.code ? 'border-destructive' : ''}`}
              />
              {fieldErrors.code && <p className="text-xs text-destructive mt-1">{fieldErrors.code}</p>}
            </div>
            <div>
              <Label>Level (optional)</Label>
              <Input
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                placeholder="e.g. Senior, Junior, Mid"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Designation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Designation</DialogTitle>
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
