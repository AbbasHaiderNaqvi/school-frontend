'use client'

import { money } from '@/lib/currency'
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
import { Download, Eye, Search, Loader2, FileText } from 'lucide-react'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildReceiptHTML(data: ReceiptPrintData): string {
  const lines = data.lines.map(l =>
    `<tr><td style="padding:4px 8px">${l.componentName}</td><td style="padding:4px 8px;text-align:right">${money(l.amount)}</td></tr>`
  ).join('')

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:24px;border:1px solid #ddd;border-radius:8px">
    <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:16px">
      <h2 style="margin:0">${data.tenant.name}</h2>
      ${data.tenant.address ? `<p style="margin:4px 0;font-size:13px">${data.tenant.address}</p>` : ''}
      ${data.tenant.phone ? `<p style="margin:4px 0;font-size:13px">${data.tenant.phone}</p>` : ''}
      ${data.tenant.email ? `<p style="margin:4px 0;font-size:13px">${data.tenant.email}</p>` : ''}
    </div>
    <h3 style="text-align:center;letter-spacing:2px">FEE RECEIPT</h3>
    <p style="text-align:center;color:#666;font-size:13px">Receipt No: ${data.receiptNo}</p>
    <table style="width:100%;margin:16px 0;background:#f9f9f9;border-radius:4px">
      <tr><td style="padding:4px 8px;font-weight:bold">Student</td><td style="padding:4px 8px">${data.student.fullName}</td></tr>
      <tr><td style="padding:4px 8px;font-weight:bold">Code</td><td style="padding:4px 8px">${data.student.userCode}</td></tr>
      ${data.student.className ? `<tr><td style="padding:4px 8px;font-weight:bold">Class</td><td style="padding:4px 8px">${data.student.className}</td></tr>` : ''}
      <tr><td style="padding:4px 8px;font-weight:bold">Invoice</td><td style="padding:4px 8px">${data.invoice.invoiceNo}</td></tr>
      <tr><td style="padding:4px 8px;font-weight:bold">Due Date</td><td style="padding:4px 8px">${data.invoice.dueDate}</td></tr>
    </table>
    ${lines ? `<table style="width:100%;margin:16px 0"><thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;padding:4px 8px">Component</th><th style="text-align:right;padding:4px 8px">Amount</th></tr></thead><tbody>${lines}</tbody></table>` : ''}
    <table style="width:100%;margin:16px 0;background:#e8f4fd;border-radius:4px">
      <tr><td style="padding:4px 8px;font-weight:bold">Payment Method</td><td style="padding:4px 8px">${data.payment.method}</td></tr>
      ${data.payment.referenceNo ? `<tr><td style="padding:4px 8px;font-weight:bold">Reference</td><td style="padding:4px 8px">${data.payment.referenceNo}</td></tr>` : ''}
      <tr><td style="padding:4px 8px;font-weight:bold">Payment Date</td><td style="padding:4px 8px">${data.payment.paymentDate}</td></tr>
      <tr style="border-top:2px solid #ccc"><td style="padding:8px;font-size:18px;font-weight:bold">Amount Paid</td><td style="padding:8px;font-size:18px;font-weight:bold;text-align:right">${money(data.payment.amount)}</td></tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:24px">Computer-generated receipt • Valid without signature<br>Issued: ${data.issuedAt}</p>
  </body></html>`
}

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
      r.studentId.toLowerCase().includes(q)
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
    const html = buildReceiptHTML(data)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Receipt_${receipt.receiptNo}.html`
    a.click()
    URL.revokeObjectURL(url)
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
          <CardTitle>Receipts</CardTitle>
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
              placeholder="Search by receipt no or invoice no…"
              className="pl-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Issued At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No receipts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-semibold">{r.receiptNo}</TableCell>
                      <TableCell className="font-mono text-sm">{r.invoiceNo}</TableCell>
                      <TableCell className="text-right font-semibold">{money(r.amount)}</TableCell>
                      <TableCell className="text-sm">{new Date(r.issuedAt).toLocaleDateString()}</TableCell>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription>{printData ? `Receipt #${printData.receiptNo}` : ''}</DialogDescription>
          </DialogHeader>

          {isPrintLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
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
                <Button className="flex-1" onClick={async () => {
                  const html = buildReceiptHTML(printData)
                  const blob = new Blob([html], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `Receipt_${printData.receiptNo}.html`
                  a.click()
                  URL.revokeObjectURL(url)
                }}>
                  <Download className="h-4 w-4 mr-2" /> Download
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
