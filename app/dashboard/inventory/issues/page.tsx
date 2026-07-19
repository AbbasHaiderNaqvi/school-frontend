'use client'

import { money } from '@/lib/currency'

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
  inventoryService, type Issue, type IssueLine, type IssueTargetType, type ItemDropdownItem,
  type LocationDropdownItem, type StockCondition,
} from '@/lib/services/inventory'
import { hrService, type Department, type Employee } from '@/lib/services/hr'
import { academicsService, type AcademicClass } from '@/lib/services/academics'
import { numberError, hasNoErrors } from '@/lib/validation'
import { Plus, Loader2, RefreshCw, PackageMinus, Trash2, Eye, Undo2 } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'

const CONDITIONS: StockCondition[] = ['NEW', 'USED', 'DAMAGED', 'BROKEN', 'EXPIRED']

type LineRow = { itemId: string; quantity: string; locationId: string; condition: StockCondition }
const blankLine = (): LineRow => ({ itemId: '', quantity: '', locationId: '', condition: 'NEW' })

export default function IssuesPage() {
  const { can } = useAuth()

  const [issues, setIssues] = useState<Issue[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<ItemDropdownItem[]>([])
  const [locations, setLocations] = useState<LocationDropdownItem[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [classes, setClasses] = useState<AcademicClass[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})
  const [targetType, setTargetType] = useState<IssueTargetType>('DEPARTMENT')
  const [targetId, setTargetId] = useState('')
  const [targetName, setTargetName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<LineRow[]>([blankLine()])

  const [viewing, setViewing] = useState<Issue | null>(null)
  const [isViewLoading, setIsViewLoading] = useState(false)

  const [returning, setReturning] = useState<Issue | null>(null)
  const [returnQtys, setReturnQtys] = useState<Record<string, string>>({})
  const [isReturning, setIsReturning] = useState(false)
  const [returnError, setReturnError] = useState('')

  const loadDropdowns = useCallback(async () => {
    const [i, l, d, c, e] = await Promise.all([
      inventoryService.getItemsDropdown(),
      inventoryService.getLocationsDropdown(),
      hrService.getDepartments({ limit: 200 }),
      academicsService.getClasses({ limit: 200 }),
      hrService.getEmployees({ limit: 200 }),
    ])
    setItems(i)
    setLocations(l)
    setDepartments(d.data)
    setClasses(c.data)
    setEmployees(e.data)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await inventoryService.getIssues({ limit: 100 })
      setIssues(result.data)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load issues.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.issue.read')) return <AccessDenied />

  const openCreate = () => {
    setTargetType('DEPARTMENT')
    setTargetId('')
    setTargetName('')
    setPurpose('')
    setDate(new Date().toISOString().slice(0, 10))
    setLines([blankLine()])
    setSubmitError('')
    setLineErrors({})
    setDialogOpen(true)
  }

  const updateLine = (index: number, patch: Partial<LineRow>) => {
    setLines(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines(prev => [...prev, blankLine()])
  const removeLine = (index: number) => setLines(prev => prev.filter((_, i) => i !== index))

  const isValid =
    date && purpose.trim() &&
    (targetType === 'OTHER' ? targetName.trim() : targetId) &&
    lines.length > 0 && lines.every(l => l.itemId && l.quantity && l.locationId)

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    lines.forEach((l, idx) => {
      const qtyErr = numberError(l.quantity, { required: true, min: 0.001, label: 'Quantity' })
      if (qtyErr) errors[`${idx}-quantity`] = qtyErr
    })
    setLineErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setSubmitError('')

    const payloadLines: IssueLine[] = lines.map(l => ({
      itemId: l.itemId,
      quantity: Number(l.quantity),
      locationId: l.locationId,
      condition: l.condition,
    }))

    const result = await inventoryService.createIssue({
      targetType,
      targetId: targetType !== 'OTHER' ? targetId : undefined,
      targetName: targetType === 'OTHER' ? targetName.trim() : undefined,
      purpose: purpose.trim(),
      date,
      lines: payloadLines,
    })

    if (result.error || !result.data) {
      setSubmitError(result.error || 'Failed to create issue')
      setIsSubmitting(false)
      return
    }

    setDialogOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const openView = async (issue: Issue) => {
    setViewing(issue)
    setIsViewLoading(true)
    const full = await inventoryService.getIssue(issue.id)
    if (full) setViewing(full)
    setIsViewLoading(false)
  }

  const openReturn = (issue: Issue) => {
    setReturning(issue)
    setReturnQtys({})
    setReturnError('')
  }

  const handleReturn = async () => {
    if (!returning) return
    const lines = Object.entries(returnQtys)
      .filter(([, qty]) => qty && Number(qty) > 0)
      .map(([issueLineId, qty]) => ({ issueLineId, quantity: Number(qty) }))
    if (lines.length === 0) return

    setIsReturning(true)
    setReturnError('')
    const result = await inventoryService.returnIssue(returning.id, { lines })
    setIsReturning(false)
    if (result.error) { setReturnError(result.error); return }
    setReturning(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Issues (Stock Out)"
        description="Issue stock to departments, classes, employees, or other purposes"
        action={
          can('inventory.issue.create') && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Issue
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Issues ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError && <Alert variant="destructive" className="mb-4"><AlertDescription>{loadError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : (
                <>
                  {issues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <PackageMinus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        No issues recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                  {issues.map(issue => (
                    <TableRow key={issue.id}>
                      <TableCell><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{issue.issueNo}</span></TableCell>
                      <TableCell>
                        <Badge variant="secondary">{issue.targetKind}</Badge>{' '}
                        <span className="text-sm text-muted-foreground">{issue.targetName ?? issue.targetId}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{issue.purpose}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{issue.issueDate}</TableCell>
                      <TableCell className="text-right font-medium">{issue.totalValue != null ? money(issue.totalValue) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openView(issue)}><Eye className="h-4 w-4" /></Button>
                          {can('inventory.issue.return') && (
                            <Button variant="ghost" size="icon" onClick={() => openReturn(issue)} title="Return"><Undo2 className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Stock Issue</DialogTitle>
            <DialogDescription>Issue stock out of the store</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Issue To</Label>
                <Select value={targetType} onValueChange={v => { setTargetType(v as IssueTargetType); setTargetId(''); setTargetName('') }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPARTMENT">Department</SelectItem>
                    <SelectItem value="CLASS">Class</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
              </div>
            </div>

            {targetType === 'DEPARTMENT' && (
              <div>
                <Label>Department <span className="text-destructive">*</span></Label>
                <Combobox
                  value={targetId}
                  onValueChange={setTargetId}
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                  placeholder="Select department"
                  searchPlaceholder="Search departments…"
                  emptyText="No departments found."
                  className="mt-1"
                />
              </div>
            )}
            {targetType === 'CLASS' && (
              <div>
                <Label>Class <span className="text-destructive">*</span></Label>
                <Combobox
                  value={targetId}
                  onValueChange={setTargetId}
                  options={classes.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select class"
                  searchPlaceholder="Search classes…"
                  emptyText="No classes found."
                  className="mt-1"
                />
              </div>
            )}
            {targetType === 'EMPLOYEE' && (
              <div>
                <Label>Employee <span className="text-destructive">*</span></Label>
                <Combobox
                  value={targetId}
                  onValueChange={setTargetId}
                  options={employees.map(e => ({ value: e.id, label: e.fullName ?? `${e.firstName} ${e.lastName}` }))}
                  placeholder="Select employee"
                  searchPlaceholder="Search employees…"
                  emptyText="No employees found."
                  className="mt-1"
                />
              </div>
            )}
            {targetType === 'OTHER' && (
              <div>
                <Label>Target Name <span className="text-destructive">*</span></Label>
                <Input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="e.g. Annual Sports Day" className="mt-1" />
              </div>
            )}

            <div>
              <Label>Purpose <span className="text-destructive">*</span></Label>
              <Textarea rows={2} value={purpose} onChange={e => setPurpose(e.target.value)} className="mt-1" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lines</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" /> Add Line</Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-2">
                    <div className="col-span-4">
                      <Label className="text-xs">Item</Label>
                      <Combobox
                        value={line.itemId}
                        onValueChange={v => updateLine(idx, { itemId: v })}
                        options={items.map(it => ({ value: it.id, label: it.name, keywords: it.code }))}
                        placeholder="Item"
                        searchPlaceholder="Search items…"
                        emptyText="No items found."
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        value={line.quantity}
                        onChange={e => updateLine(idx, { quantity: e.target.value })}
                        className={`mt-1 ${lineErrors[`${idx}-quantity`] ? 'border-destructive' : ''}`}
                      />
                      {lineErrors[`${idx}-quantity`] && <p className="text-xs text-destructive mt-1">{lineErrors[`${idx}-quantity`]}</p>}
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Location</Label>
                      <Combobox
                        value={line.locationId}
                        onValueChange={v => updateLine(idx, { locationId: v })}
                        options={locations.map(l => ({ value: l.id, label: l.path }))}
                        placeholder="Location"
                        searchPlaceholder="Search locations…"
                        emptyText="No locations found."
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Condition</Label>
                      <Select value={line.condition} onValueChange={v => updateLine(idx, { condition: v as StockCondition })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue {viewing?.issueNo}</DialogTitle>
            <DialogDescription>
              {viewing?.purpose} · {viewing?.issueDate}
              {viewing?.totalValue != null ? ` · ${money(viewing.totalValue)}` : ''}
            </DialogDescription>
          </DialogHeader>
          {isViewLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Condition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewing?.lines?.map((l, i) => (
                  <TableRow key={l.id ?? i}>
                    <TableCell>{l.itemName ?? l.itemId}</TableCell>
                    <TableCell>{l.quantity}</TableCell>
                    <TableCell>{l.returnedQty ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.locationPath ?? l.locationId}</TableCell>
                    <TableCell><Badge variant="secondary">{l.condition}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!returning} onOpenChange={open => !open && setReturning(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Return Stock — Issue {returning?.issueNo}</DialogTitle>
            <DialogDescription>Enter the quantity being returned per line (up to the issued amount, minus any already returned)</DialogDescription>
          </DialogHeader>
          {returnError && <Alert variant="destructive"><AlertDescription>{returnError}</AlertDescription></Alert>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Already Returned</TableHead>
                <TableHead className="w-32">Return Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returning?.lines?.filter(l => l.id).map(l => {
                const lineId = l.id as string
                return (
                <TableRow key={lineId}>
                  <TableCell>{l.itemName ?? l.itemId}</TableCell>
                  <TableCell>{l.quantity}</TableCell>
                  <TableCell>{l.returnedQty ?? 0}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={returnQtys[lineId] ?? ''}
                      onChange={e => setReturnQtys(prev => ({ ...prev, [lineId]: e.target.value }))}
                      max={l.quantity - (l.returnedQty ?? 0)}
                    />
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturning(null)} disabled={isReturning}>Cancel</Button>
            <Button onClick={handleReturn} disabled={isReturning}>
              {isReturning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
