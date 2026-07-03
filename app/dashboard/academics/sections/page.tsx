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
import type { AcademicSection, AcademicClass } from '@/lib/services/academics'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, LayoutList } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

export default function SectionsPage() {
  const { can } = useAuth()

  const [sections, setSections] = useState<AcademicSection[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicSection | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({ classId: '', name: '', capacity: '', sortOrder: '' })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [sectResult, clsResult] = await Promise.all([
        academicsService.getSections({
          limit: 200,
          classId: filterClass !== 'all' ? filterClass : undefined,
          isActive: filterActive === 'all' ? undefined : filterActive === 'active',
        }),
        academicsService.getClasses({ limit: 200 }),
      ])
      setSections(sectResult.data)
      setTotal(sectResult.total)
      setClasses(clsResult.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load sections.')
    } finally {
      setIsLoading(false)
    }
  }, [filterClass, filterActive])

  useEffect(() => { loadData() }, [loadData])

  if (!can('academics.section.read')) return <AccessDenied />

  const filtered = sections.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.className?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ classId: filterClass !== 'all' ? filterClass : '', name: '', capacity: '', sortOrder: '' })
    setSubmitError('')
    setDialogOpen(true)
  }

  const openEdit = (sec: AcademicSection) => {
    setEditing(sec)
    setForm({
      classId: sec.classId,
      name: sec.name,
      capacity: sec.capacity != null ? String(sec.capacity) : '',
      sortOrder: '',
    })
    setSubmitError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.classId || !form.name.trim()) return
    setIsSubmitting(true)
    setSubmitError('')

    if (editing) {
      const updated = await academicsService.updateSection(editing.id, {
        name: form.name.trim(),
        capacity: form.capacity ? Number(form.capacity) : undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      })
      if (!updated) {
        setSubmitError('Failed to update section')
        setIsSubmitting(false)
        return
      }
    } else {
      const result = await academicsService.createSection({
        classId: form.classId,
        name: form.name.trim(),
        capacity: form.capacity ? Number(form.capacity) : undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      })
      if (result.error || !result.section) {
        setSubmitError(result.error || 'Failed to create section')
        setIsSubmitting(false)
        return
      }
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const handleToggleActive = async (sec: AcademicSection) => {
    await academicsService.updateSection(sec.id, { isActive: !sec.isActive })
    loadData()
  }

  const handleDelete = async (sec: AcademicSection) => {
    if (!confirm(`Delete section "${sec.name}"? This cannot be undone.`)) return
    await academicsService.deleteSection(sec.id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sections"
        description="Manage class sections and divisions"
        action={
          can('academics.section.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Section
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Sections ({total})</CardTitle>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sections…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead>Class</TableHead>
                  <TableHead className="text-center">Capacity</TableHead>
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
                  <TableHead>Class</TableHead>
                  <TableHead className="text-center">Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <LayoutList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No sections found
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(sec => (
                  <TableRow key={sec.id}>
                    <TableCell className="font-semibold">{sec.name}</TableCell>
                    <TableCell className="text-muted-foreground">{sec.className ?? '—'}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{sec.capacity ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={sec.isActive ? 'default' : 'secondary'}>
                        {sec.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('academics.section.update') && (
                            <DropdownMenuItem onClick={() => openEdit(sec)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {can('academics.section.update') && (
                            <DropdownMenuItem onClick={() => handleToggleActive(sec)}>
                              {sec.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          )}
                          {can('academics.section.delete') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(sec)} className="text-destructive">
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
            <DialogTitle>{editing ? 'Edit Section' : 'Add New Section'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for section ${editing.name}` : 'Create a new section within a class.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            {!editing && (
              <div>
                <Label>Class <span className="text-destructive">*</span></Label>
                <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Section Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Section A"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Capacity (optional)</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                placeholder="e.g. 30"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Sort Order (optional)</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                placeholder="1"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim() || (!editing && !form.classId)}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
