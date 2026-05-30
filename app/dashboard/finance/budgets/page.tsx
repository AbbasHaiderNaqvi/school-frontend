'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/lib/services/finance'
import type { Budget, GlAccount } from '@/lib/services/finance'
import { Plus, Search, Loader2, Wallet } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BudgetsPage() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newBudget, setNewBudget] = useState({
    name: '',
    glAccountId: '',
    allocatedAmount: '',
    startDate: '',
    endDate: '',
  })

  const canManage = user?.role === 'tenant_owner' || user?.role === 'admin' || user?.role === 'accountant'

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [buds, accts] = await Promise.all([
      financeService.getBudgets(),
      financeService.getGLAccounts({ type: 'EXPENSE' }),
    ])
    setBudgets(buds)
    setGlAccounts(accts)
    setIsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    if (!newBudget.name || !newBudget.glAccountId || !newBudget.allocatedAmount || !newBudget.startDate || !newBudget.endDate) return
    setIsSubmitting(true)
    setCreateError('')
    const result = await financeService.createBudget({
      name: newBudget.name,
      glAccountId: newBudget.glAccountId,
      allocatedAmount: newBudget.allocatedAmount,
      startDate: newBudget.startDate,
      endDate: newBudget.endDate,
    })
    if (result.error || !result.budget) {
      setCreateError(result.error || 'Failed to create budget')
      setIsSubmitting(false)
      return
    }
    setNewBudget({ name: '', glAccountId: '', allocatedAmount: '', startDate: '', endDate: '' })
    setIsCreateOpen(false)
    setIsSubmitting(false)
    loadData()
  }

  const filtered = budgets.filter(b =>
    !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalAllocated = budgets.reduce((s, b) => s + parseFloat(b.allocatedAmount), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Management"
        description="Create and monitor budgets by GL account"
        action={
          canManage ? (
            <Button onClick={() => { setCreateError(''); setIsCreateOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" /> New Budget
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Budgets</p>
              <p className="text-2xl font-bold">{budgets.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10"><Wallet className="h-6 w-6 text-primary" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Allocated</p>
              <p className="text-2xl font-bold">${fmt(totalAllocated)}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100"><Wallet className="h-6 w-6 text-green-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search budgets…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
          <CardDescription>{filtered.length} budgets found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GL Account</TableHead>
                  <TableHead className="text-right">Allocated Amount</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{b.glAccountId.slice(-8)}</TableCell>
                    <TableCell className="text-right font-semibold">${fmt(b.allocatedAmount)}</TableCell>
                    <TableCell>{b.startDate}</TableCell>
                    <TableCell>{b.endDate}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No budgets found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>Set up a new budget allocation linked to a GL account</DialogDescription>
          </DialogHeader>
          {createError && <Alert variant="destructive"><AlertDescription>{createError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div>
              <Label>Budget Name</Label>
              <Input value={newBudget.name} onChange={e => setNewBudget(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Salaries 2025" className="mt-1" />
            </div>
            <div>
              <Label>GL Account (Expense)</Label>
              <Select value={newBudget.glAccountId} onValueChange={v => setNewBudget(f => ({ ...f, glAccountId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select expense account" /></SelectTrigger>
                <SelectContent>
                  {glAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Allocated Amount</Label>
              <Input type="number" value={newBudget.allocatedAmount} onChange={e => setNewBudget(f => ({ ...f, allocatedAmount: e.target.value }))} placeholder="0.00" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={newBudget.startDate} onChange={e => setNewBudget(f => ({ ...f, startDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={newBudget.endDate} onChange={e => setNewBudget(f => ({ ...f, endDate: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !newBudget.name || !newBudget.glAccountId || !newBudget.allocatedAmount || !newBudget.startDate || !newBudget.endDate}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
