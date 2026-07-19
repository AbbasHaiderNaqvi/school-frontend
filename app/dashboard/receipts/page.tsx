'use client'

import { money } from '@/lib/currency'
import { printReceipt, downloadReceipt } from '@/lib/receipt-print'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { feeService } from '@/lib/services/fee'
import type { FeeReceipt, ReceiptPrintData } from '@/lib/services/fee'
import { Download, Eye, Search, FileText, Printer } from 'lucide-react'
import { SkeletonTableRows } from '@/components/ui/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<FeeReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [printData, setPrintData] = useState<ReceiptPrintData | null>(null)
  const [isPrintLoading, setIsPrintLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await feeService.getReceipts({ limit: 200 })
      setReceipts(result.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = receipts.filter(r => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return r.receiptNo.toLowerCase().includes(q) ||
      r.invoiceNo.toLowerCase().includes(q) ||
      r.studentName?.toLowerCase().includes(q) ||
      r.className?.toLowerCase().includes(q)
  })

  const totalAmount = receipts.filter(r => !r.isVoided).reduce((s, r) => s + parseFloat(r.amount), 0)
  const activeCount = receipts.filter(r => !r.isVoided).length
  const voidedCount = receipts.filter(r => r.isVoided).length

  const handlePreview = async (receipt: FeeReceipt) => {
    setIsPrintLoading(true)
    setShowPreview(true)
    const data = await feeService.getReceiptPrintData(receipt.id)
    setPrintData(data)
    setIsPrintLoading(false)
  }

  const handleDownload = async (receipt: FeeReceipt) => {
    const data = await feeService.getReceiptPrintData(receipt.id)
    if (!data) return
    downloadReceipt(data)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Receipts" description="View and download payment receipts" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Receipts</p>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">{money(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Voided Receipts</p>
            <p className="text-2xl font-bold text-red-600">{voidedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipts ({filtered.length})</CardTitle>
          <CardDescription>All fee payment receipts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by receipt no, invoice no, student, or class…"
              className="pl-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonTableRows rows={6} cols={10} />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No receipts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => (
                    <TableRow key={r.id} className={r.isVoided ? 'opacity-60' : ''}>
                      <TableCell className="font-mono font-semibold">{r.receiptNo}</TableCell>
                      <TableCell className="font-mono text-sm">{r.invoiceNo}</TableCell>
                      <TableCell className="font-medium">{r.studentName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.className ?? '—'}</TableCell>
                      <TableCell className={`text-right font-semibold ${r.isVoided ? 'line-through text-muted-foreground' : ''}`}>{money(r.amount)}</TableCell>
                      <TableCell className="text-sm">{r.paymentMethod ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.paymentDate ?? r.createdAt?.slice(0, 10) ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.receivedByName ?? '—'}</TableCell>
                      <TableCell>
                        {r.isVoided
                          ? <Badge variant="destructive">Voided</Badge>
                          : <Badge className="bg-green-100 text-green-700">Active</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handlePreview(r)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDownload(r)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription>{printData ? `Receipt #${printData.receiptNo}` : ''}</DialogDescription>
          </DialogHeader>

          {isPrintLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : printData ? (
            <div className="space-y-4">
              <div className="p-6 rounded-lg border space-y-4">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">{printData.tenant.name}</h2>
                  {printData.tenant.address && <p className="text-sm text-muted-foreground">{printData.tenant.address}</p>}
                  {printData.tenant.phone && <p className="text-sm text-muted-foreground">{printData.tenant.phone}</p>}
                  {printData.tenant.email && <p className="text-sm text-muted-foreground">{printData.tenant.email}</p>}
                </div>
                <div className="text-center">
                  <h3 className="font-bold tracking-widest">FEE RECEIPT</h3>
                  <p className="text-sm text-muted-foreground">#{printData.receiptNo}</p>
                </div>
                <div className="bg-muted rounded p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="font-medium">Student:</span><span>{printData.student.fullName}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Code:</span><span className="font-mono">{printData.student.userCode}</span></div>
                  {printData.student.className && <div className="flex justify-between"><span className="font-medium">Class:</span><span>{printData.student.className}</span></div>}
                  <div className="flex justify-between"><span className="font-medium">Invoice:</span><span className="font-mono">{printData.invoice.invoiceNo}</span></div>
                </div>
                {printData.lines.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {printData.lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell>{l.componentName}</TableCell>
                          <TableCell className="text-right">{money(l.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="bg-blue-50 rounded p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="font-medium">Payment Method:</span><span>{printData.payment.method}</span></div>
                  {printData.payment.referenceNo && <div className="flex justify-between"><span className="font-medium">Reference:</span><span>{printData.payment.referenceNo}</span></div>}
                  <div className="flex justify-between"><span className="font-medium">Date:</span><span>{printData.payment.paymentDate}</span></div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Amount Paid:</span><span>{money(printData.payment.amount)}</span>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">Computer-generated receipt • Valid without signature</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPreview(false)}>Close</Button>
                <Button variant="outline" className="flex-1" onClick={() => downloadReceipt(printData)}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
                <Button className="flex-1" onClick={() => printReceipt(printData)}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p>Print data not available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
