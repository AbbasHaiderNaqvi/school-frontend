'use client'

import { money } from '@/lib/currency'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { financeService } from '@/lib/services/finance'
import type { GlAccount, GlAccountType } from '@/lib/services/finance'
import { Plus, Search, Loader2, MoreHorizontal, Edit, Database } from 'lucide-react'

type NormalSide = 'DEBIT' | 'CREDIT'

const TYPE_OPTIONS: Array<{ value: GlAccountType; label: string }> = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
]

const TYPE_COLORS: Record<GlAccountType, string> = {
  ASSET: 'bg-green-100 text-green-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-purple-100 text-purple-800',
  INCOME: 'bg-blue-100 text-blue-800',
  EXPENSE: 'bg-orange-100 text-orange-800',
}

function defaultNormalSide(type: GlAccountType): NormalSide {
  return type === 'ASSET' || type === 'EXPENSE' ? 'DEBIT' : 'CREDIT'
}

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function GeneralLedgerPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [error, setError] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [editingAccount, setEditingAccount] = useState<GlAccount | null>(null)
  const [newAccount, setNewAccount] = useState<{ code: string; name: string; type: GlAccountType; normalSide: NormalSide; description: string }>({
    code: '', name: '', type: 'ASSET', normalSide: 'DEBIT', description: '',
  })

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await financeService.getGLAccounts(
        filterType !== 'all' ? { type: filterType as GlAccountType } : {}
      )
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [filterType])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const handleCreate = async () => {
    if (!newAccount.code || !newAccount.name) return
    setIsSubmitting(true)
    setSubmitError('')
    const result = await financeService.createGLAccount({
      code: newAccount.code,
      name: newAccount.name,
      type: newAccount.type,
      normalSide: newAccount.normalSide,
      description: newAccount.description || undefined,
    })
    if (result.error || !result.account) {
      setSubmitError(result.error || 'Failed to create account')
      setIsSubmitting(false)
      return
    }
    setNewAccount({ code: '', name: '', type: 'ASSET', normalSide: 'DEBIT', description: '' })
    setIsCreateOpen(false)
    setIsSubmitting(false)
    loadAccounts()
  }

  const handleEdit = async () => {
    if (!editingAccount) return
    setIsSubmitting(true)
    setSubmitError('')
    const result = await financeService.updateGLAccount(editingAccount.id, {
      code: editingAccount.code,
      name: editingAccount.name,
    })
    if (!result) {
      setSubmitError('Failed to update account')
      setIsSubmitting(false)
      return
    }
    setIsEditOpen(false)
    setEditingAccount(null)
    setIsSubmitting(false)
    loadAccounts()
  }

  const handleSeedDefaults = async () => {
    setIsSubmitting(true)
    const result = await financeService.bootstrapDefaultGL()
    setIsSubmitting(false)
    if (result) {
      loadAccounts()
      alert(`Seeded ${result.created} default GL accounts.`)
    }
  }

  const filtered = accounts.filter(a => {
    const q = searchQuery.toLowerCase()
    return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
  })

  const totalByType = accounts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + parseFloat(a.balance || '0')
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <PageHeader title="General Ledger" description="Manage chart of accounts">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedDefaults} disabled={isSubmitting}>
            <Database className="h-4 w-4 mr-2" /> Seed Defaults
          </Button>
          <Button onClick={() => { setSubmitError(''); setIsCreateOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Account
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {TYPE_OPTIONS.map(({ value, label }) => (
          <Card key={value}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-bold mt-1">{money(totalByType[value] || 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search accounts…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Chart of Accounts ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal Side</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No accounts found</TableCell></TableRow>
                )}
                {filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.code}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><Badge className={TYPE_COLORS[a.type]}>{a.type}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{a.normalSide}</Badge></TableCell>
                    <TableCell><Badge variant={a.isActive ? 'default' : 'secondary'}>{a.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{money(a.balance)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingAccount({ ...a }); setSubmitError(''); setIsEditOpen(true) }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create GL Account</DialogTitle>
            <DialogDescription>Add a new account to the chart of accounts</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input placeholder="e.g. 1001" value={newAccount.code} onChange={e => setNewAccount(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newAccount.type} onValueChange={v => setNewAccount(f => ({ ...f, type: v as GlAccountType, normalSide: defaultNormalSide(v as GlAccountType) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input placeholder="Account name" value={newAccount.name} onChange={e => setNewAccount(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Normal Side</Label>
              <Select value={newAccount.normalSide} onValueChange={v => setNewAccount(f => ({ ...f, normalSide: v as NormalSide }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !newAccount.code || !newAccount.name}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit GL Account</DialogTitle>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
          {editingAccount && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Code</Label>
                <Input value={editingAccount.code} onChange={e => setEditingAccount(a => a ? { ...a, code: e.target.value } : a)} />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={editingAccount.name} onChange={e => setEditingAccount(a => a ? { ...a, name: e.target.value } : a)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
