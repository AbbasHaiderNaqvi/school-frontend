'use client'

import { money } from '@/lib/currency'
import { useAuth } from '@/contexts/auth-context'
import { useEffect, useState, useCallback } from 'react'
import { financeService } from '@/lib/services/finance'
import type { ExpenseApprovalSettings, ExpenseApprovalHistoryEntry } from '@/lib/services/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2, Save, History } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { numberError, hasNoErrors } from '@/lib/validation'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ThresholdManagementPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<ExpenseApprovalSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [newThreshold, setNewThreshold] = useState('')
  const [newEnabled, setNewEnabled] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<ExpenseApprovalHistoryEntry[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)

  const canManageThreshold = user?.role === 'tenant_owner' || user?.role === 'tenant_admin' || user?.role === 'tenant_principal'

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError('')
    const data = await financeService.getExpenseApproval()
    setSettings(data)
    if (data) {
      setNewThreshold(data.threshold)
      setNewEnabled(data.enabled)
    }
    setIsLoading(false)
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    try {
      setHistory(await financeService.getExpenseApprovalHistory())
    } catch {
      setHistory([])
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  useEffect(() => { loadSettings() }, [loadSettings])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const thresholdErr = numberError(newThreshold, { required: newEnabled, min: 0, label: 'Threshold amount' })
    if (thresholdErr) errors.threshold = thresholdErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleUpdate = async () => {
    if (!validate()) return
    setIsUpdating(true)
    setError('')
    const result = await financeService.updateExpenseApproval({ enabled: newEnabled, threshold: newThreshold })
    if (!result.success) {
      setError(result.error || 'Failed to update expense approval settings')
      setIsUpdating(false)
      return
    }
    await Promise.all([loadSettings(), loadHistory()])
    setIsDialogOpen(false)
    setIsUpdating(false)
  }

  if (!canManageThreshold) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Threshold Management</h1>
          <p className="text-muted-foreground">Only admins can access this page</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>You do not have permission to manage approval thresholds.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expense Approval Threshold</h1>
        <p className="text-muted-foreground">Configure the expense amount that requires approval</p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>Current Settings</CardTitle>
          <CardDescription>Expenses exceeding the threshold require approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : settings ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Approval Required</p>
                    <p className="font-semibold">{settings.enabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Threshold Amount</p>
                    <p className="text-4xl font-bold text-primary">{money(settings.threshold)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.enabled
                    ? `Expenses above ${money(settings.threshold)} require approval`
                    : 'Expense approval workflow is currently disabled'}
                </p>
              </div>
              <Button onClick={() => { setFieldErrors({}); setError(''); setIsDialogOpen(true) }}>
                <Save className="h-4 w-4 mr-2" /> Update Settings
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No expense approval settings found. Click Update Settings to configure.</p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Change History</CardTitle>
          <CardDescription>Every change made to the approval threshold</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead>Changed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isHistoryLoading ? (
                <SkeletonTableRows rows={4} cols={4} />
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No changes recorded yet</TableCell>
                </TableRow>
              ) : (
                history.map((h, i) => (
                  <TableRow key={h.id ?? i}>
                    <TableCell className="text-sm text-muted-foreground">
                      {typeof h.createdAt === 'string' ? h.createdAt.slice(0, 16).replace('T', ' ') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.enabled ? 'default' : 'secondary'}>{h.enabled ? 'Enabled' : 'Disabled'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{h.threshold != null ? money(String(h.threshold)) : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(h.changedByName as string) ?? (h.changedByUserId as string) ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Approval Settings</DialogTitle>
            <DialogDescription>Configure the expense approval threshold</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label>Enable Approval Workflow</Label>
              <Switch checked={newEnabled} onCheckedChange={setNewEnabled} />
            </div>
            {newEnabled && (
              <div>
                <Label>Threshold Amount</Label>
                <Input
                  type="number"
                  value={newThreshold}
                  onChange={e => setNewThreshold(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  className={`mt-1 ${fieldErrors.threshold ? 'border-destructive' : ''}`}
                />
                {fieldErrors.threshold && <p className="text-xs text-destructive mt-1">{fieldErrors.threshold}</p>}
                <p className="text-xs text-muted-foreground mt-1">Expenses above this amount will require approval</p>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
