'use client'

import { money } from '@/lib/currency'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/lib/services/finance'
import type { FinanceTransaction } from '@/lib/services/finance'
import { CheckCircle, XCircle, Clock, DollarSign, AlertCircle, Loader2 } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AccountsApprovalPage() {
  const { can } = useAuth()
  const [pending, setPending] = useState<FinanceTransaction[]>([])
  const [threshold, setThreshold] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<FinanceTransaction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [expenses, settings] = await Promise.all([
        financeService.getPendingExpenses(),
        financeService.getExpenseApproval(),
      ])
      setPending(expenses)
      setThreshold(settings?.threshold ?? null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (!can('finance.expense_approval.read')) return <AccessDenied />

  const handleApprove = async () => {
    if (!selected) return
    setIsSubmitting(true)
    setActionError('')
    const ok = await financeService.approveExpense(selected.id, comments || undefined)
    if (!ok) {
      setActionError('Failed to approve transaction')
      setIsSubmitting(false)
      return
    }
    setDialogOpen(false)
    setComments('')
    setSelected(null)
    loadData()
  }

  const handleReject = async () => {
    if (!selected || !comments.trim()) return
    setIsSubmitting(true)
    setActionError('')
    const ok = await financeService.rejectExpense(selected.id, comments)
    if (!ok) {
      setActionError('Failed to reject transaction')
      setIsSubmitting(false)
      return
    }
    setDialogOpen(false)
    setComments('')
    setSelected(null)
    loadData()
  }

  const openReview = (t: FinanceTransaction) => {
    setSelected(t)
    setComments('')
    setActionError('')
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Approval"
        description="Review and approve expense transactions pending authorization"
        action={
          threshold !== null ? (
            <Card className="px-4 py-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Approval Threshold</p>
                <p className="text-sm font-bold">{money(threshold)}</p>
              </div>
            </Card>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold">{pending.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-100"><Clock className="h-6 w-6 text-amber-600" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Pending Amount</p>
              <p className="text-2xl font-bold">{money(pending.reduce((s, t) => s + parseFloat(t.amount), 0))}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10"><DollarSign className="h-6 w-6 text-primary" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Expense transactions requiring authorization</CardDescription>
        </CardHeader>
        <CardContent>
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No pending transactions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{t.description}</span>
                      <Badge className="bg-amber-100 text-amber-800 shrink-0">Pending</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{t.reference}</p>
                    {t.categoryAccount && (
                      <p className="text-xs text-muted-foreground">{t.categoryAccount.code} — {t.categoryAccount.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <p className="text-xl font-bold">{money(t.amount)}</p>
                    {(can('finance.transaction.approve') || can('finance.transaction.reject')) && (
                      <Button size="sm" onClick={() => openReview(t)}>Review</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Transaction</DialogTitle>
            <DialogDescription>Approve or reject this expense</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-mono font-medium">{selected.reference}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold">{money(selected.amount)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium">{selected.description}</p>
                </div>
                {selected.categoryAccount && (
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p>{selected.categoryAccount.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{selected.date}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Comments {can('finance.transaction.reject') ? '(required to reject)' : '(optional)'}
                </label>
                <Textarea
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Add notes or rejection reason…"
                  rows={3}
                  className="mt-1"
                />
              </div>

              {actionError && (
                <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            {can('finance.transaction.reject') && (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || !comments.trim()}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            )}
            {can('finance.transaction.approve') && (
              <Button onClick={handleApprove} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" /> Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
