'use client'

import { money } from '@/lib/currency'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { feeService } from '@/lib/services/fee'
import type { FeeDashboardSummary, FeeInvoice, FeeStructure, InvoiceStatus } from '@/lib/services/fee'
import {
  DollarSign, Receipt, AlertTriangle, CheckCircle,
  ArrowRight, FileText, CreditCard, Users, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

function fmt(val: string | number | undefined): string {
  const n = parseFloat(String(val ?? 0))
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusVariant(status: InvoiceStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'PAID') return 'default'
  if (status === 'OVERDUE') return 'destructive'
  if (status === 'PARTIAL') return 'secondary'
  return 'outline'
}

export default function FeeOverviewPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<FeeDashboardSummary | null>(null)
  const [invoices, setInvoices] = useState<FeeInvoice[]>([])
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const [sum, inv, str] = await Promise.all([
          feeService.getDashboardSummary(),
          feeService.getInvoices({ limit: 5 }),
          feeService.getStructures({ limit: 5 }),
        ])
        setSummary(sum)
        setInvoices(inv.data)
        setStructures(str.data)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.tenantId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fee Management" description="Manage student fees and payments" />
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  const totalOverdue = parseFloat(summary?.totalOverdue ?? '0')
  const totalCollected = parseFloat(summary?.totalCollected ?? '0')
  const totalInvoiced = parseFloat(summary?.totalInvoiced ?? '0')
  const totalOutstanding = parseFloat(summary?.totalOutstanding ?? '0')
  const collectionRate = summary?.collectionRate ?? '0'

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Management" description="Manage student fees and payments" />

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Invoiced" value={`${money(totalInvoiced)}`} description="Total billed" icon={Receipt} />
        <StatCard title="Total Collected" value={`${money(totalCollected)}`} description="Payments received" icon={DollarSign} />
        <StatCard title="Outstanding" value={`${money(totalOutstanding)}`} description="Pending collection" icon={AlertTriangle} />
        <StatCard title="Collection Rate" value={`${parseFloat(collectionRate).toFixed(1)}%`} description="Of total invoiced" icon={CheckCircle} />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/dashboard/fees/students', icon: Users, label: 'Student Fees', sub: 'Manage & bulk edit' },
          { href: '/dashboard/fees/structures', icon: FileText, label: 'Fee Structures', sub: `${structures.length} structures defined` },
          { href: '/dashboard/fees/invoices', icon: Receipt, label: 'Invoices', sub: 'View all invoices' },
          { href: '/dashboard/fees/payments', icon: CreditCard, label: 'Payments', sub: 'Record payments' },
        ].map(({ href, icon: Icon, label, sub }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground">{sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Overdue Alert */}
      {totalOverdue > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Overdue Fees</p>
              <p className="text-sm text-muted-foreground">Total overdue: {money(totalOverdue)}</p>
            </div>
            <Link href="/dashboard/fees/invoices?status=OVERDUE">
              <Button variant="destructive">View Overdue</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest fee invoices</CardDescription>
            </div>
            <Link href="/dashboard/fees/invoices">
              <Button variant="outline" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>}
              {invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-foreground">{invoice.studentName || invoice.invoiceNo}</p>
                    <p className="text-sm text-muted-foreground">{invoice.className} — Due {invoice.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{money(invoice.totalAmount)}</p>
                    <Badge variant={statusVariant(invoice.status)} className="mt-1">{invoice.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fee Structures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Fee Structures</CardTitle>
              <CardDescription>Defined fee configurations</CardDescription>
            </div>
            <Link href="/dashboard/fees/structures">
              <Button variant="outline" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {structures.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No structures defined</p>}
              {structures.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.academicYear} — {s.componentCount ?? 0} components</p>
                  </div>
                  <span className="font-bold text-foreground">{money(s.totalAmount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
