'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction, TransactionType, TransactionStatus } from '@/lib/services/finance'
import { Search, TrendingDown, TrendingUp, DollarSign, AlertCircle, Loader2 } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
}

const STATUS_COLORS: Record<TransactionStatus, string> = {
  POSTED: 'bg-green-50 text-green-700 border-green-200',
  PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  REVERSED: 'bg-gray-50 text-gray-700 border-gray-200',
}

export default function AllTransactionsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const result = await financeService.getTransactions({
      limit: 200,
      type: filterType !== 'all' ? (filterType as TransactionType) : undefined,
      status: filterStatus !== 'all' ? (filterStatus as TransactionStatus) : undefined,
    })
    setTransactions(result.data)
    setTotal(result.total)
    setIsLoading(false)
  }, [filterType, filterStatus])

  useEffect(() => { loadData() }, [loadData])

  const filtered = transactions.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return t.description.toLowerCase().includes(q) ||
      t.reference.toLowerCase().includes(q) ||
      (t.categoryAccount?.name ?? '').toLowerCase().includes(q)
  })

  const totalIncome = transactions.filter(t => t.type === 'INCOME' && t.status === 'POSTED').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'POSTED').reduce((s, t) => s + parseFloat(t.amount), 0)
  const pendingCount = transactions.filter(t => t.status === 'PENDING_APPROVAL').length
  const net = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <PageHeader title="All Transactions" description="Complete financial transaction history" />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold text-green-600">${fmt(totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Expense</p>
                <p className="text-xl font-bold text-red-600">${fmt(totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className={`h-5 w-5 ${net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className={`text-xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>${fmt(net)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions ({total})</CardTitle>
          <CardDescription>All financial transactions with complete details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by description, category, or reference…" className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell><Badge className={TYPE_COLORS[t.type]}>{t.type}</Badge></TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="text-muted-foreground">{t.categoryAccount?.name ?? '—'}</TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                          {t.type === 'INCOME' ? '+' : '-'}${fmt(t.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[t.status]}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{t.reference}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {transactions.length} transactions</p>
        </CardContent>
      </Card>
    </div>
  )
}
