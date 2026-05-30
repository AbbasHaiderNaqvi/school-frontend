'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { financeService } from '@/lib/services/finance'
import { CheckCircle, XCircle, Clock, DollarSign, AlertCircle } from 'lucide-react'

interface PendingTransaction {
  id: string
  description: string
  amount: number
  category: string
  requestedBy: string
  requestedByName: string
  date: string
  status: string
  requiresApproval: boolean
}

export default function AccountsApprovalPage() {
  const { user } = useAuth()
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([])
  const [approvedTransactions, setApprovedTransactions] = useState<PendingTransaction[]>([])
  const [rejectedTransactions, setRejectedTransactions] = useState<PendingTransaction[]>([])
  const [threshold, setThreshold] = useState(5000)
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null)
  const [approvalDialog, setApprovalDialog] = useState(false)
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user?.tenantId) return

    try {
      const currentThreshold = await financeService.getCurrentThreshold(user.tenantId)
      setThreshold(currentThreshold)

      const transactions = await financeService.getTransactions(user.tenantId)
      
      const pending = transactions.filter((t: any) => 
        t.amount > currentThreshold && t.status === 'pending'
      )
      const approved = transactions.filter((t: any) => 
        t.amount > currentThreshold && t.status === 'approved'
      )
      const rejected = transactions.filter((t: any) => 
        t.amount > currentThreshold && t.status === 'rejected'
      )

      setP endingTransactions(pending)
      setApprovedTransactions(approved)
      setRejectedTransactions(rejected)
    } catch (error) {
      console.error('[v0] Error loading data:', error)
    }
  }

  const handleApprove = async () => {
    if (!selectedTransaction || !user) return

    setLoading(true)
    try {
      // In real implementation, update transaction status
      await new Promise(resolve => setTimeout(resolve, 500))
      
      alert('Transaction approved successfully')
      setApprovalDialog(false)
      setComments('')
      loadData()
    } catch (error) {
      console.error('[v0] Error approving:', error)
      alert('Error approving transaction')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedTransaction || !user) return

    setLoading(true)
    try {
      // In real implementation, update transaction status
      await new Promise(resolve => setTimeout(resolve, 500))
      
      alert('Transaction rejected')
      setApprovalDialog(false)
      setComments('')
      loadData()
    } catch (error) {
      console.error('[v0] Error rejecting:', error)
      alert('Error rejecting transaction')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
    }
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status.toUpperCase()}</Badge>
  }

  if (!user || !['tenant_owner', 'trustee', 'admin'].includes(user.role)) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to view this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts Approval</h1>
          <p className="text-muted-foreground">Review and approve transactions exceeding threshold</p>
        </div>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Approval Threshold</div>
              <div className="text-xl font-bold">{formatCurrency(threshold)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pendingTransactions.reduce((sum, t) => sum + t.amount, 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(approvedTransactions.reduce((sum, t) => sum + t.amount, 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(rejectedTransactions.reduce((sum, t) => sum + t.amount, 0))} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Transactions requiring your approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending transactions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{transaction.description}</h3>
                      {getStatusBadge(transaction.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Category: {transaction.category} | Requested by: {transaction.requestedByName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Date: {new Date(transaction.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatCurrency(transaction.amount)}</div>
                      {transaction.amount > threshold && (
                        <div className="text-xs text-yellow-600">Exceeds threshold</div>
                      )}
                    </div>
                    <Button onClick={() => {
                      setSelectedTransaction(transaction)
                      setApprovalDialog(true)
                    }}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Transaction</DialogTitle>
            <DialogDescription>Approve or reject this transaction</DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-semibold">{selectedTransaction.description}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Amount</div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedTransaction.amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div>{selectedTransaction.category}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Requested By</div>
                  <div>{selectedTransaction.requestedByName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div>{new Date(selectedTransaction.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Comments (Optional)</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments or notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
