'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Combobox } from '@/components/ui/combobox'
import { inventoryService, type InventoryLocation } from '@/lib/services/inventory'
import { Plus, Edit, Trash2, Loader2, RefreshCw, MapPin, ChevronRight, ChevronDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const NONE = '__none__'
const EMPTY_FORM = { name: '', kind: '', parentId: '' }

function LocationNode({
  node, depth, expanded, onToggle, onEdit, onDelete, canManage,
}: {
  node: InventoryLocation
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onEdit: (loc: InventoryLocation) => void
  onDelete: (loc: InventoryLocation) => void
  canManage: boolean
}) {
  const hasChildren = !!node.children && node.children.length > 0
  const isOpen = expanded.has(node.id)

  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 py-2 pr-2 rounded hover:bg-muted/50 group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button onClick={() => onToggle(node.id)} className="text-muted-foreground shrink-0">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{node.name}</span>
          {node.kind && <span className="text-xs text-muted-foreground shrink-0">· {node.kind}</span>}
        </div>
        {canManage && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(node)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children!.map(child => (
            <LocationNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function InventoryLocationsPage() {
  const { can } = useAuth()
  const canManage = can('inventory.location.manage')

  const [tree, setTree] = useState<InventoryLocation[]>([])
  const [flat, setFlat] = useState<Array<{ id: string; name: string; path: string }>>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryLocation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const [deleteTarget, setDeleteTarget] = useState<InventoryLocation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const collectIds = (nodes: InventoryLocation[]): string[] =>
    nodes.flatMap(n => [n.id, ...(n.children ? collectIds(n.children) : [])])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [treeData, dropdown] = await Promise.all([
        inventoryService.getLocationsTree(),
        inventoryService.getLocationsDropdown(),
      ])
      setTree(treeData)
      setFlat(dropdown.map(d => ({ id: d.id, name: d.name, path: d.path })))
      setExpanded(new Set(collectIds(treeData)))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load locations.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.location.read')) return <AccessDenied />

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError('')
    setDialogOpen(true)
  }

  const openEdit = (loc: InventoryLocation) => {
    setEditing(loc)
    setForm({ name: loc.name, kind: loc.kind ?? '', parentId: loc.parentId ?? '' })
    setSubmitError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      name: form.name.trim(),
      kind: form.kind.trim() || undefined,
      parentId: form.parentId || undefined,
    }

    const result = editing
      ? await inventoryService.updateLocation(editing.id, payload)
      : await inventoryService.createLocation(payload)

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
    const { error } = await inventoryService.deleteLocation(deleteTarget.id)
    setIsDeleting(false)
    if (error) { setDeleteError(error); return }
    setDeleteTarget(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage Locations"
        description="Where stock physically sits — campus, building, room, cabinet, shelf, bin (any level optional)"
        action={
          canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Location
              </Button>
            </div>
          )
        }
      />

      {loadError && (
        <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 10 }).map((_, i) => {
                const depth = [0, 1, 1, 2, 2, 0, 1, 2, 1, 0][i]
                return (
                  <div key={i} className="flex items-center gap-3 py-2" style={{ paddingLeft: depth * 24 }}>
                    <Skeleton className="h-4 w-4 rounded-sm flex-shrink-0" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full ml-auto" />
                    <Skeleton className="h-7 w-7" />
                  </div>
                )
              })}
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No locations defined yet
            </div>
          ) : (
            <div>
              {tree.map(node => (
                <LocationNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  onEdit={openEdit}
                  onDelete={loc => { setDeleteTarget(loc); setDeleteError('') }}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle>
            <DialogDescription>
              {editing ? `Update details for ${editing.name}` : 'Add a node to the location tree.'}
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Store Room 2, Cabinet A, Shelf 3"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type (optional)</Label>
              <Input
                value={form.kind}
                onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}
                placeholder="e.g. Building, Room, Cabinet, Shelf, Bin"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Parent Location (optional)</Label>
              <Combobox
                value={form.parentId || NONE}
                onValueChange={v => setForm(f => ({ ...f, parentId: v === NONE ? '' : v }))}
                options={[
                  { value: NONE, label: 'None (top level)' },
                  ...flat.filter(d => d.id !== editing?.id).map(d => ({ value: d.id, label: d.path })),
                ]}
                placeholder="None (top level)"
                searchPlaceholder="Search locations…"
                emptyText="No locations found."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !form.name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Location'}
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
              This cannot be undone. Locations with sub-locations or stock cannot be deleted.
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
