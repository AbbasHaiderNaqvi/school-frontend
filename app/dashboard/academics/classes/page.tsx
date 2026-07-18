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
import { academicsService } from '@/lib/services/academics'
import type { AcademicClass } from '@/lib/services/academics'
import { requiredError, numberError, hasNoErrors } from '@/lib/validation'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, GraduationCap } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

export default function ClassesPage() {
  const { can } = useAuth()

  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicClass | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', description: '', sortOrder: '' })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await academicsService.getClasses({
        limit: 200,
        search: search || undefined,
        isActive: filterActive === 'all' ? undefined : filterActive === 'active',
      })
      setClasses(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load classes.')
    } finally {
      setIsLoading(false)
    }
  }, [search, filterActive])

  useEffect(() => { loadData() }, [loadData])

  if (!can('academics.class.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', sortOrder: '' })
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openEdit = (cls: AcademicClass) => {
    setEditing(cls)
    setForm({ name: cls.name, description: cls.description ?? '', sortOrder: String(cls.sortOrder ?? '') })
    setSubmitError('')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const nameErr = requiredError(form.name, 'Class name')
    if (nameErr) errors.name = nameErr
    const sortOrderErr = numberError(form.sortOrder, { min: 0, label: 'Sort order' })
    if (sortOrderErr) errors.sortOrder = sortOrderErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    }

    if (editing) {
      const result = await academicsService.updateClass(editing.id, payload)
      if (result.error || !result.cls) {
        setSubmitError(result.error || 'Failed to update class')
        setIsSubmitting(false)
        return
      }
    } else {
      const result = await academicsService.createClass(payload)
      if (result.error || !result.cls) {
        setSubmitError(result.error || 'Failed to create class')
        setIsSubmitting(false)
        return
      }
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const handleToggleActive = async (cls: AcademicClass) => {
    await academicsService.updateClass(cls.id, { isActive: !cls.isActive })
    loadData()
  }

  const handleDelete = async (cls: AcademicClass) => {
    if (!confirm(`Delete class "${cls.name}"? This cannot be undone.`)) return
    await academicsService.deleteClass(cls.id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Manage grade levels and class definitions"
        action={
          can('academics.class.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Class
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Classes ({total})</CardTitle>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SkeletonTableRows rows={5} cols={5} />
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No classes found
                    </TableCell>
                  </TableRow>
                )}
                {classes.map(cls => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-semibold">{cls.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cls.description ?? '—'}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{cls.sortOrder ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={cls.isActive ? 'default' : 'secondary'}>
                        {cls.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('academics.class.update') && (
                            <DropdownMenuItem onClick={() => openEdit(cls)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {can('academics.class.update') && (
                            <DropdownMenuItem onClick={() => handleToggleActive(cls)}>
                              {cls.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          )}
                          {can('academics.class.delete') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(cls)} className="text-destructive">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Class' : 'Add New Class'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.name}` : 'Create a new grade level or class.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label>Class Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Grade 1"
                className={`mt-1 ${fieldErrors.name ? 'border-destructive' : ''}`}
              />
              {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. First grade primary level"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Sort Order (optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                placeholder="1"
                className={`mt-1 ${fieldErrors.sortOrder ? 'border-destructive' : ''}`}
              />
              {fieldErrors.sortOrder && <p className="text-xs text-destructive mt-1">{fieldErrors.sortOrder}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
