'use client'

import { useEffect, useState } from 'react'
import { money } from '@/lib/currency'
import { useAuth } from '@/contexts/auth-context'
import { feeService, type FeeComponent, type FeeComponentType } from '@/lib/services/fee'
import { metadataService } from '@/lib/services/metadata'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Loader2, DollarSign, ArrowLeft, PlayCircle, PauseCircle } from 'lucide-react'

// Confirmed valid values (backend rejects anything else): "type must be one of
// the following values: REGULAR, ADMISSION, EXAM, TRANSPORT, LATE, DISCOUNT,
// SCHOLARSHIP, OTHER". Used as the guaranteed option set; metadataService's
// dynamic dropdown (if it returns anything) takes precedence.
export const FALLBACK_COMPONENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'EXAM', label: 'Exam' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'LATE', label: 'Late' },
  { value: 'DISCOUNT', label: 'Discount' },
  { value: 'SCHOLARSHIP', label: 'Scholarship' },
  { value: 'OTHER', label: 'Other' },
]

interface ManageFeeComponentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  components: FeeComponent[]
  onChanged: () => void | Promise<void>
  /** 'create' skips the list view and opens straight into the create form,
   * closing (instead of returning to the list) after a successful save —
   * used for the quick-add entry point inside the structure editor. */
  initialMode?: 'list' | 'create'
  onCreated?: (component: FeeComponent) => void
}

type EditState = { id: string | null; name: string; type: string; description: string; defaultAmount: string; isActive: boolean }

const BLANK: EditState = { id: null, name: '', type: 'REGULAR', description: '', defaultAmount: '', isActive: true }

export function ManageFeeComponentsDialog({ open, onOpenChange, components, onChanged, initialMode = 'list', onCreated }: ManageFeeComponentsDialogProps) {
  const { can } = useAuth()
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>(FALLBACK_COMPONENT_TYPES)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    metadataService.getFeeDropdowns().then(dropdowns => {
      if (dropdowns?.componentTypes?.length) setTypeOptions(dropdowns.componentTypes)
    })
  }, [open])

  useEffect(() => {
    if (open && initialMode === 'create') {
      setEditing({ ...BLANK })
      setSaveError('')
    }
  }, [open, initialMode])

  const openCreate = () => { setEditing({ ...BLANK }); setSaveError('') }
  const openEdit = (c: FeeComponent) => {
    setEditing({ id: c.id, name: c.name, type: c.type, description: c.description ?? '', defaultAmount: c.defaultAmount, isActive: c.isActive })
    setSaveError('')
  }

  const handleSave = async () => {
    if (!editing || !editing.name || !editing.defaultAmount) return
    setIsSaving(true)
    setSaveError('')

    if (editing.id) {
      const updated = await feeService.updateComponent(editing.id, {
        name: editing.name,
        description: editing.description || undefined,
        defaultAmount: editing.defaultAmount,
        isActive: editing.isActive,
      })
      if (!updated) { setSaveError('Failed to update component'); setIsSaving(false); return }
    } else {
      const result = await feeService.createComponent({
        name: editing.name,
        type: editing.type as FeeComponentType,
        description: editing.description || undefined,
        defaultAmount: editing.defaultAmount,
      })
      if (result.error || !result.component) { setSaveError(result.error || 'Failed to create component'); setIsSaving(false); return }

      if (initialMode === 'create') {
        await onChanged()
        setIsSaving(false)
        setEditing(null)
        onCreated?.(result.component)
        onOpenChange(false)
        return
      }
    }

    await onChanged()
    setEditing(null)
    setIsSaving(false)
  }

  const handleDelete = async (c: FeeComponent) => {
    if (!confirm(`Delete component "${c.name}"? This cannot be undone.`)) return
    setDeletingId(c.id)
    await feeService.deleteComponent(c.id)
    await onChanged()
    setDeletingId(null)
  }

  const handleToggleActive = async (c: FeeComponent) => {
    setTogglingId(c.id)
    await feeService.updateComponent(c.id, { isActive: !c.isActive })
    await onChanged()
    setTogglingId(null)
  }

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setEditing(null) }}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialMode === 'create' ? 'New Fee Component' : 'Fee Components'}</DialogTitle>
          <DialogDescription>
            {initialMode === 'create'
              ? 'Create a reusable fee component — it will be available to add to this structure right away.'
              : 'Manage the reusable catalog of fee components (e.g., Tuition, Transport, Library).'}
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4 py-2">
            {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g., Tuition Fee" />
              </div>
              <div className="space-y-2">
                <Label>Default Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" value={editing.defaultAmount} onChange={e => setEditing({ ...editing, defaultAmount: e.target.value })} className="pl-8" />
                </div>
              </div>
            </div>

            {!editing.id && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editing.type} onValueChange={v => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="e.g., Monthly tuition fee" />
            </div>

            {editing.id && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive components are hidden from the structure catalog picker.</p>
                </div>
                <Switch checked={editing.isActive} onCheckedChange={checked => setEditing({ ...editing, isActive: checked })} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => initialMode === 'create' ? onOpenChange(false) : setEditing(null)}
                disabled={isSaving}
              >
                {initialMode === 'create' ? 'Cancel' : (<><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</>)}
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !editing.name || !editing.defaultAmount || (!editing.id && !editing.type)}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing.id ? 'Save Changes' : 'Add Component'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              {can('fees.component.create') && (
                <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-3.5 w-3.5" /> Add Component</Button>
              )}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Default Amount</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          {c.name}
                          {!c.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        </div>
                        {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                      <TableCell className="text-right">{money(c.defaultAmount)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {can('fees.component.update') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={c.isActive ? 'Deactivate' : 'Activate'}
                              onClick={() => handleToggleActive(c)}
                              disabled={togglingId === c.id}
                            >
                              {togglingId === c.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : c.isActive ? (
                                <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          )}
                          {can('fees.component.update') && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {can('fees.component.delete') && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c)} disabled={deletingId === c.id}>
                              {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {components.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No fee components yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
