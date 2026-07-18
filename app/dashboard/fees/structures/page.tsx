'use client'

import { money } from '@/lib/currency'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AccessDenied } from '@/components/ui/access-denied'
import { feeService } from '@/lib/services/fee'
import type { FeeStructure, FeeStructureStatus, FeeComponent } from '@/lib/services/fee'
import { academicsService } from '@/lib/services/academics'
import type { AcademicClass } from '@/lib/services/academics'
import { ManageFeeComponentsDialog } from '@/components/fees/manage-fee-components-dialog'
import { ApplyStructureDialog } from '@/components/fees/apply-structure-dialog'
import { Plus, Edit, Trash2, Copy, FileText, DollarSign, Loader2, MoreHorizontal, PlayCircle, PauseCircle, Users, Settings2 } from 'lucide-react'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'

type FormComponent = { id: string; name: string; amount: number; dueDate: string; feeComponentId?: string }

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusBadgeVariant(status: FeeStructureStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'ACTIVE') return 'default'
  if (status === 'DRAFT') return 'secondary'
  return 'outline'
}

export default function FeeStructuresPage() {
  const { can } = useAuth()
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [components, setComponents] = useState<FeeComponent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showManageComponents, setShowManageComponents] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [formName, setFormName] = useState('')
  const [formClassId, setFormClassId] = useState('')
  const [formAcademicYear, setFormAcademicYear] = useState('2025-2026')
  const [formNotes, setFormNotes] = useState('')
  const [formComponents, setFormComponents] = useState<FormComponent[]>([])
  const [catalogPick, setCatalogPick] = useState('')
  const [showQuickCreateComponent, setShowQuickCreateComponent] = useState(false)
  const [applyTarget, setApplyTarget] = useState<FeeStructure | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [strData, clsData, compData] = await Promise.all([
        feeService.getStructures({ limit: 100 }),
        academicsService.getClasses({ limit: 100 }),
        feeService.getComponents({ limit: 100 }),
      ])
      setStructures(strData.data)
      setClasses(clsData.data)
      setComponents(compData.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reloadComponents = useCallback(async () => {
    const compData = await feeService.getComponents({ limit: 100 })
    setComponents(compData.data)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openCreate = () => {
    setEditingStructure(null)
    setFormName('')
    setFormClassId('')
    setFormAcademicYear('2025-2026')
    setFormNotes('')
    setFormComponents([])
    setSaveError('')
    setShowDialog(true)
  }

  const openEdit = async (s: FeeStructure) => {
    setActionLoadingId(s.id)
    // The list endpoint may only return a componentCount summary — fetch the
    // detail endpoint so the edit form always has the full component list.
    const detail = (await feeService.getStructureById(s.id)) ?? s
    setActionLoadingId(null)

    setEditingStructure(detail)
    setFormName(detail.name)
    setFormClassId(detail.classId)
    setFormAcademicYear(detail.academicYear)
    setFormNotes(detail.notes ?? '')
    setFormComponents(
      (detail.components ?? []).map(c => ({
        id: c.id,
        name: c.name,
        amount: parseFloat(c.amount) || 0,
        dueDate: c.dueDate ?? '',
        feeComponentId: c.feeComponentId,
      }))
    )
    setSaveError('')
    setShowDialog(true)
  }

  const openDuplicate = async (s: FeeStructure) => {
    setActionLoadingId(s.id)
    await feeService.duplicateStructure(s.id)
    await loadData()
    setActionLoadingId(null)
  }

  const handleToggleActive = async (s: FeeStructure) => {
    setActionLoadingId(s.id)
    if (s.status === 'ACTIVE') {
      await feeService.deactivateStructure(s.id)
    } else {
      const result = await feeService.activateStructure(s.id)
      if (result.error) alert(result.error)
    }
    await loadData()
    setActionLoadingId(null)
  }

  const handleDelete = async (s: FeeStructure) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return
    setActionLoadingId(s.id)
    await feeService.deleteStructure(s.id)
    await loadData()
    setActionLoadingId(null)
  }

  const handlePickFromCatalog = (componentId: string) => {
    const comp = components.find(c => c.id === componentId)
    if (!comp) return
    setFormComponents(f => [...f, {
      id: crypto.randomUUID(),
      name: comp.name,
      amount: parseFloat(comp.defaultAmount) || 0,
      dueDate: '',
      feeComponentId: comp.id,
    }])
    setCatalogPick('')
  }

  const handleComponentCreated = (comp: FeeComponent) => {
    setFormComponents(f => [...f, {
      id: crypto.randomUUID(),
      name: comp.name,
      amount: parseFloat(comp.defaultAmount) || 0,
      dueDate: '',
      feeComponentId: comp.id,
    }])
  }

  const handleRemoveComponent = (id: string) => {
    setFormComponents(f => f.filter(c => c.id !== id))
  }

  const handleComponentChange = (id: string, field: keyof FormComponent, value: string | number) => {
    setFormComponents(f => f.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleSave = async () => {
    if (!formName || (!editingStructure && !formClassId)) return
    setIsSaving(true)
    setSaveError('')

    const componentsPayload = formComponents.map((c, i) => ({
      name: c.name,
      amount: String(c.amount),
      dueDate: c.dueDate || undefined,
      feeComponentId: c.feeComponentId,
      sortOrder: i,
    }))

    if (editingStructure) {
      const ok = await feeService.updateStructure(editingStructure.id, {
        name: formName,
        academicYear: formAcademicYear,
        notes: formNotes || undefined,
        components: componentsPayload,
      })
      if (!ok) { setSaveError('Failed to update structure'); setIsSaving(false); return }
    } else {
      const result = await feeService.createStructure({
        classId: formClassId,
        academicYear: formAcademicYear,
        name: formName,
        notes: formNotes || undefined,
        components: componentsPayload,
      })
      if (result.error || !result.structure) {
        setSaveError(result.error || 'Failed to create structure')
        setIsSaving(false)
        return
      }
    }

    await loadData()
    setShowDialog(false)
    setIsSaving(false)
  }

  const totalAmount = formComponents.reduce((s, c) => s + c.amount, 0)

  if (!can('fees.structure.read')) return <AccessDenied />

  if (isLoading) {
    return <OverviewPageSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Structures" description="Define fee components and amounts for each class" />

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">{structures.length} fee structure{structures.length !== 1 ? 's' : ''} defined</p>
        <div className="flex gap-2">
          {can('fees.component.read') && (
            <Button variant="outline" onClick={() => setShowManageComponents(true)}>
              <Settings2 className="mr-2 h-4 w-4" /> Manage Components
            </Button>
          )}
          {can('fees.structure.create') && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create Structure
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {structures.map(s => (
          <Card key={s.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <CardDescription>{s.className ?? s.classId} — {s.academicYear}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
                  <Badge variant="secondary">{s.componentCount ?? s.components?.length ?? 0} fees</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {(s.components ?? []).map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="font-medium">{money(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary">{money(s.totalAmount)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {can('fees.structure.update') && (
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => openEdit(s)} disabled={actionLoadingId === s.id}>
                    {actionLoadingId === s.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Edit className="mr-1 h-3 w-3" />} Edit
                  </Button>
                )}
                {can('fees.structure.duplicate') && (
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => openDuplicate(s)} disabled={actionLoadingId === s.id}>
                    <Copy className="mr-1 h-3 w-3" /> Duplicate
                  </Button>
                )}
                {can('fees.structure.update') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => handleToggleActive(s)}
                    disabled={actionLoadingId === s.id}
                  >
                    {s.status === 'ACTIVE' ? <PauseCircle className="mr-1 h-3 w-3" /> : <PlayCircle className="mr-1 h-3 w-3" />}
                    {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
                {(can('fees.structure.update') || can('fees.structure.delete')) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0 bg-transparent" disabled={actionLoadingId === s.id}>
                        {actionLoadingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {can('fees.structure.update') && (
                        <DropdownMenuItem onClick={() => setApplyTarget(s)}>
                          <Users className="mr-2 h-4 w-4" /> Apply to Students
                        </DropdownMenuItem>
                      )}
                      {can('fees.structure.delete') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(s)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {structures.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Fee Structures</h3>
              <p className="text-muted-foreground mt-2">Create your first fee structure to define fee components for a class.</p>
              {can('fees.structure.create') && (
                <Button className="mt-4" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create Structure</Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}</DialogTitle>
            <DialogDescription>Define the fee components and amounts for a class</DialogDescription>
          </DialogHeader>

          {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}

          <div className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Structure Name</Label>
                <Input placeholder="e.g., Grade 1 Annual Fee 2025-26" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={formAcademicYear} onValueChange={setFormAcademicYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                    <SelectItem value="2026-2027">2026-2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingStructure && (
              <div className="space-y-2">
                <Label>Class</Label>
                <Combobox
                  value={formClassId}
                  onValueChange={setFormClassId}
                  options={classes.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select a class"
                  searchPlaceholder="Search classes…"
                  emptyText="No classes found."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Internal notes about this fee structure…"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Fee Components</Label>
                <div className="flex gap-2 flex-wrap">
                  <Combobox
                    value={catalogPick}
                    onValueChange={handlePickFromCatalog}
                    disabled={components.length === 0}
                    options={components.filter(c => c.isActive).map(c => ({
                      value: c.id,
                      label: `${c.name} — ${money(c.defaultAmount)} · ${c.type}`,
                      keywords: c.type,
                    }))}
                    placeholder={components.length > 0 ? 'Add from catalog…' : 'No catalog components yet'}
                    searchPlaceholder="Search components…"
                    emptyText="No components found."
                    className="w-64"
                  />
                  <Button variant="outline" size="sm" onClick={() => setShowQuickCreateComponent(true)}>
                    <Plus className="mr-1 h-3 w-3" /> New Component
                  </Button>
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-36">Amount</TableHead>
                      <TableHead className="w-40">Due Date</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formComponents.map(comp => (
                      <TableRow key={comp.id}>
                        <TableCell>
                          <Input value={comp.name} onChange={e => handleComponentChange(comp.id, 'name', e.target.value)} placeholder="e.g., Tuition Fee" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-medium text-sm px-1" title="Amount is set by the catalog component and can't be edited here">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {money(comp.amount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={comp.dueDate} onChange={e => handleComponentChange(comp.id, 'dueDate', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveComponent(comp.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {formComponents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No components added yet. Pick one from the catalog above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-semibold">Total Fee Amount</span>
                <span className="text-2xl font-bold text-primary">{money(totalAmount)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !formName || (!editingStructure && !formClassId) || formComponents.some(c => !c.name || c.amount <= 0)}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStructure ? 'Save Changes' : 'Create Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageFeeComponentsDialog
        open={showManageComponents}
        onOpenChange={setShowManageComponents}
        components={components}
        onChanged={reloadComponents}
      />

      <ManageFeeComponentsDialog
        open={showQuickCreateComponent}
        onOpenChange={setShowQuickCreateComponent}
        components={components}
        onChanged={reloadComponents}
        initialMode="create"
        onCreated={handleComponentCreated}
      />

      <ApplyStructureDialog
        open={applyTarget !== null}
        onOpenChange={open => { if (!open) setApplyTarget(null) }}
        structure={applyTarget}
      />
    </div>
  )
}
