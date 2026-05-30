'use client'

import { useAuth } from '@/contexts/auth-context'
import { useEffect, useState, useCallback } from 'react'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction } from '@/lib/services/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Eye, RefreshCw } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<FinanceTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selected, setSelected] = useState<FinanceTransaction | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadExpenses = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await financeService.getPendingExpenses()
      setExpenses(data)
    } catch {
      setError('Failed to load pending approvals')
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  const openReview = (exp: FinanceTransaction) => {
    setSelected(exp)
    setAction(null)
    setComments('')
    setActionError('')
    setIsDialogOpen(true)
  }

  const handleApprove = async () => {
    if (!selected) return
    setIsSubmitting(true)
    setActionError('')
    const ok = await financeService.approveExpense(selected.id, comments || undefined)
    if (!ok) {
      setActionError('Failed to approve. Please try again.')
      setIsSubmitting(false)
      return
    }
    setIsSubmitting(false)
    setIsDialogOpen(false)
    loadExpenses()
  }

  const handleReject = async () => {
    if (!selected || !comments.trim()) {
      setActionError('Please provide a reason for rejection.')
      return
    }
    setIsSubmitting(true)
    setActionError('')
    const ok = await financeService.rejectExpense(selected.id, comments)
    if (!ok) {
      setActionError('Failed to reject. Please try again.')
      setIsSubmitting(false)
      return
    }
    setIsSubmitting(false)
    setIsDialogOpen(false)
    loadExpenses()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Approvals</h1>
          <p className="text-muted-foreground">Review and approve pending expense requests</p>
        </div>
        <Button variant="outline" onClick={loadExpenses} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({expenses.length})</CardTitle>
          <CardDescription>Expenses awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : expenses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pending approvals</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-mono text-sm">{exp.reference}</TableCell>
                    <TableCell>{exp.date}</TableCell>
                    <TableCell className="max-w-xs truncate">{exp.description}</TableCell>
                    <TableCell>
                      {exp.categoryAccount
                        ? <Badge variant="outline">{exp.categoryAccount.name}</Badge>
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">${fmt(exp.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{exp.status.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openReview(exp)}>
                        <Eye className="h-4 w-4 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={o => { if (!o) setAction(null); setIsDialogOpen(o) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Expense</DialogTitle>
            <DialogDescription>Approve or reject this expense request</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-4">
                <div><p className="text-muted-foreground">Reference</p><p className="font-mono font-medium">{selected.reference}</p></div>
                <div><p className="text-muted-foreground">Date</p><p className="font-medium">{selected.date}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground">Description</p><p className="font-medium">{selected.description}</p></div>
                <div><p className="text-muted-foreground">Amount</p><p className="font-bold text-lg">${fmt(selected.amount)}</p></div>
                <div><p className="text-muted-foreground">Category</p><p className="font-medium">{selected.categoryAccount?.name ?? '—'}</p></div>
                {selected.paymentAccount && (
                  <div><p className="text-muted-foreground">Payment Account</p><p className="font-medium">{selected.paymentAccount.name}</p></div>
                )}
              </div>

              {action && (
                <div>
                  <Label>{action === 'approve' ? 'Notes (optional)' : 'Reason for rejection *'}</Label>
                  <Textarea
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder={action === 'approve' ? 'Add any approval notes…' : 'Explain why this is being rejected…'}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {actionError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Close</Button>
            {action ? (
              <>
                <Button variant="outline" onClick={() => setAction(null)} disabled={isSubmitting}>Back</Button>
                {action === 'approve' ? (
                  <Button onClick={handleApprove} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Approval
                  </Button>
                ) : (
                  <Button onClick={handleReject} disabled={isSubmitting} variant="destructive">
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <XCircle className="h-4 w-4 mr-2" /> Confirm Rejection
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => { setAction('reject'); setActionError('') }}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setAction('approve'); setActionError('') }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
