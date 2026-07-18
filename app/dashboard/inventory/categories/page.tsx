'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Combobox } from '@/components/ui/combobox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { inventoryService, type InventoryCategory, type DropdownItem } from '@/lib/services/inventory'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, RefreshCw, Tags } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const NONE = '__none__'
const EMPTY_FORM = { name: '', description: '', parentId: '' }

export default function InventoryCategoriesPage() {
  const { can } = useAuth()

  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [dropdown, setDropdown] = useState<DropdownItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const [deleteTarget, setDeleteTarget] = useState<InventoryCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [result, dd] = await Promise.all([
        inventoryService.getCategories({ limit: 200, search: search || undefined }),
        inventoryService.getCategoriesDropdown(),
      ])
      setCategories(result.data)
      setTotal(result.total)
      setDropdown(dd)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load categories.')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.category.read')) return <AccessDenied />

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError('')
    setDialogOpen(true)
  }

  const openEdit = (cat: InventoryCategory) => {
    setEditing(cat)
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      parentId: cat.parentId ?? cat.parent?.id ?? '',
    })
    setSubmitError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      parentId: form.parentId || undefined,
    }

    const result = editing
      ? await inventoryService.updateCategory(editing.id, payload)
      : await inventoryService.createCategory(payload)

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
    const { error } = await inventoryService.deleteCategory(deleteTarget.id)
    setIsDeleting(false)
    if (error) { setDeleteError(error); return }
    setDeleteTarget(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Categories"
        description="Group items into categories such as Stationery, Lab Supplies, IT Equipment"
        action={
          can('inventory.category.manage') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Categories ({total})</CardTitle>
          <div className="relative max-w-sm mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories…"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={4} />
              ) : (
                <>
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Tags className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No categories found
                      </TableCell>
                    </TableRow>
                  )}
                  {categories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-semibold">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {cat.parent?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {cat.description ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('inventory.category.manage') && (
                              <DropdownMenuItem onClick={() => openEdit(cat)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {can('inventory.category.manage') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setDeleteTarget(cat); setDeleteError('') }} className="text-destructive">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.name}` : 'Create a new inventory category.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label>Category Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Stationery"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Parent Category (optional)</Label>
              <Combobox
                value={form.parentId || NONE}
                onValueChange={v => setForm(f => ({ ...f, parentId: v === NONE ? '' : v }))}
                options={[
                  { value: NONE, label: 'None' },
                  ...dropdown.filter(d => d.id !== editing?.id).map(d => ({ value: d.id, label: d.name })),
                ]}
                placeholder="None"
                searchPlaceholder="Search categories…"
                emptyText="No categories found."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Categories with items or sub-categories cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive"><AlertDescription>{deleteError}</AlertDescription></Alert>
          )}
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
