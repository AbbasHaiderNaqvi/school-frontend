'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { feeService } from '@/lib/services/fee'
import type { FeeStructure } from '@/lib/services/fee'
import { academicsService } from '@/lib/services/academics'
import type { AcademicClass } from '@/lib/services/academics'
import { Plus, Edit, Trash2, Copy, FileText, DollarSign, Loader2 } from 'lucide-react'

type FormComponent = { id: string; name: string; amount: number; dueDate: string }

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FeeStructuresPage() {
  const { user } = useAuth()
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [formName, setFormName] = useState('')
  const [formClassId, setFormClassId] = useState('')
  const [formAcademicYear, setFormAcademicYear] = useState('2025-2026')
  const [formComponents, setFormComponents] = useState<FormComponent[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [strData, clsData] = await Promise.all([
      feeService.getStructures({ limit: 100 }),
      academicsService.getClasses({ limit: 100 }),
    ])
    setStructures(strData.data)
    setClasses(clsData.data)
    setIsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openCreate = () => {
    setEditingStructure(null)
    setFormName('')
    setFormClassId('')
    setFormAcademicYear('2025-2026')
    setFormComponents([
      { id: crypto.randomUUID(), name: 'Tuition Fee', amount: 5000, dueDate: '2025-09-01' },
    ])
    setSaveError('')
    setShowDialog(true)
  }

  const openEdit = (s: FeeStructure) => {
    setEditingStructure(s)
    setFormName(s.name)
    setFormClassId(s.classId)
    setFormAcademicYear(s.academicYear)
    setFormComponents(
      (s.components ?? []).map(c => ({
        id: c.id,
        name: c.name,
        amount: parseFloat(c.amount) || 0,
        dueDate: c.dueDate ?? '',
      }))
    )
    setSaveError('')
    setShowDialog(true)
  }

  const openDuplicate = async (s: FeeStructure) => {
    setIsSaving(true)
    await feeService.duplicateStructure(s.id)
    await loadData()
    setIsSaving(false)
  }

  const handleAddComponent = () => {
    setFormComponents(f => [...f, { id: crypto.randomUUID(), name: '', amount: 0, dueDate: '2025-09-01' }])
  }

  const handleRemoveComponent = (id: string) => {
    setFormComponents(f => f.filter(c => c.id !== id))
  }

  const handleComponentChange = (id: string, field: keyof FormComponent, value: string | number) => {
    setFormComponents(f => f.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleSave = async () => {
    if (!formClassId || !formName) return
    setIsSaving(true)
    setSaveError('')

    const components = formComponents.map((c, i) => ({
      name: c.name,
      amount: String(c.amount),
      dueDate: c.dueDate || undefined,
      sortOrder: i,
    }))

    if (editingStructure) {
      const ok = await feeService.updateStructure(editingStructure.id, {
        name: formName,
        academicYear: formAcademicYear,
        components,
      })
      if (!ok) { setSaveError('Failed to update structure'); setIsSaving(false); return }
    } else {
      const result = await feeService.createStructure({
        classId: formClassId,
        academicYear: formAcademicYear,
        name: formName,
        components,
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fee Structures" description="Manage fee templates for each class" />
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Structures" description="Define fee components and amounts for each class" />

      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">{structures.length} fee structure{structures.length !== 1 ? 's' : ''} defined</p>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Structure
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {structures.map(s => (
          <Card key={s.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <CardDescription>{s.className ?? s.classId} — {s.academicYear}</CardDescription>
                </div>
                <Badge variant="secondary">{s.componentCount ?? s.components?.length ?? 0} fees</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {(s.components ?? []).map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="font-medium">${fmt(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary">${fmt(s.totalAmount)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => openEdit(s)}>
                  <Edit className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => openDuplicate(s)} disabled={isSaving}>
                  <Copy className="mr-1 h-3 w-3" /> Duplicate
                </Button>
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
              <Button className="mt-4" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create Structure</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Select value={formClassId} onValueChange={setFormClassId}>
                  <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Fee Components</Label>
                <Button variant="outline" size="sm" onClick={handleAddComponent}>
                  <Plus className="mr-1 h-3 w-3" /> Add Component
                </Button>
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
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input type="number" value={comp.amount} onChange={e => handleComponentChange(comp.id, 'amount', parseFloat(e.target.value) || 0)} className="pl-8" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={comp.dueDate} onChange={e => handleComponentChange(comp.id, 'dueDate', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveComponent(comp.id)} disabled={formComponents.length <= 1}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-semibold">Total Fee Amount</span>
                <span className="text-2xl font-bold text-primary">${fmt(totalAmount)}</span>
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
    </div>
  )
}
