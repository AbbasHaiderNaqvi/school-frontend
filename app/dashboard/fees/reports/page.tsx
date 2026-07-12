'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { feeService } from '@/lib/services/fee'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportView } from '@/components/reports/report-view'
import { FeeReportFilters, defaultFeeReportFilters, type FeeReportFilterValues } from '@/components/reports/fee-report-filters'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2, Download, Wallet, AlertTriangle, CalendarDays, CalendarRange, BadgePercent,
} from 'lucide-react'

const TABS = ['collection-summary', 'outstanding', 'defaulters', 'daily-collection', 'monthly-collection', 'discount-scholarship'] as const
type ReportTab = typeof TABS[number]
type ExportFormat = 'pdf' | 'csv' | 'xlsx'

export default function FeeReportsPage() {
  const { can } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<ReportTab>('collection-summary')
  const [loadedTabs, setLoadedTabs] = useState<Set<ReportTab>>(new Set())

  const [collectionFilters, setCollectionFilters] = useState(defaultFeeReportFilters())
  const [collectionData, setCollectionData] = useState<unknown>(null)
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)

  const [outstandingFilters, setOutstandingFilters] = useState(defaultFeeReportFilters())
  const [outstandingData, setOutstandingData] = useState<unknown>(null)
  const [outstandingLoading, setOutstandingLoading] = useState(false)

  const [defaultersFilters, setDefaultersFilters] = useState(defaultFeeReportFilters())
  const [defaultersData, setDefaultersData] = useState<unknown>(null)
  const [defaultersLoading, setDefaultersLoading] = useState(false)

  const [dailyFilters, setDailyFilters] = useState(defaultFeeReportFilters())
  const [dailyData, setDailyData] = useState<unknown>(null)
  const [dailyLoading, setDailyLoading] = useState(false)

  const [monthlyFilters, setMonthlyFilters] = useState(defaultFeeReportFilters())
  const [monthlyData, setMonthlyData] = useState<unknown>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  const [discountFilters, setDiscountFilters] = useState(defaultFeeReportFilters())
  const [discountData, setDiscountData] = useState<unknown>(null)
  const [discountLoading, setDiscountLoading] = useState(false)

  const toParams = (f: FeeReportFilterValues) => ({
    academicYear: f.academicYear || undefined,
    classId: f.classId || undefined,
    from: f.from || undefined,
    to: f.to || undefined,
  })

  const runCollectionSummary = useCallback(async () => {
    setCollectionLoading(true)
    setCollectionData(await feeService.getCollectionSummaryReport(toParams(collectionFilters)))
    setCollectionLoading(false)
  }, [collectionFilters])

  const runOutstanding = useCallback(async () => {
    setOutstandingLoading(true)
    setOutstandingData(await feeService.getOutstandingReport(toParams(outstandingFilters)))
    setOutstandingLoading(false)
  }, [outstandingFilters])

  const runDefaulters = useCallback(async () => {
    setDefaultersLoading(true)
    setDefaultersData(await feeService.getDefaultersReport(toParams(defaultersFilters)))
    setDefaultersLoading(false)
  }, [defaultersFilters])

  const runDaily = useCallback(async () => {
    setDailyLoading(true)
    setDailyData(await feeService.getDailyCollectionReport(toParams(dailyFilters)))
    setDailyLoading(false)
  }, [dailyFilters])

  const runMonthly = useCallback(async () => {
    setMonthlyLoading(true)
    setMonthlyData(await feeService.getMonthlyCollectionReport(toParams(monthlyFilters)))
    setMonthlyLoading(false)
  }, [monthlyFilters])

  const runDiscount = useCallback(async () => {
    setDiscountLoading(true)
    setDiscountData(await feeService.getDiscountScholarshipSummary(toParams(discountFilters)))
    setDiscountLoading(false)
  }, [discountFilters])

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format)
    const { success, error } = await feeService.downloadCollectionSummaryReport({ ...toParams(collectionFilters), format })
    setExportingFormat(null)
    if (!success) {
      toast({ title: 'Export failed', description: error || 'Could not generate the file.', variant: 'destructive' })
    }
  }

  // Lazily run each report the first time its tab is opened.
  useEffect(() => {
    if (loadedTabs.has(activeTab)) return
    setLoadedTabs(prev => new Set(prev).add(activeTab))
    if (activeTab === 'collection-summary') runCollectionSummary()
    else if (activeTab === 'outstanding') runOutstanding()
    else if (activeTab === 'defaulters') runDefaulters()
    else if (activeTab === 'daily-collection') runDaily()
    else if (activeTab === 'monthly-collection') runMonthly()
    else if (activeTab === 'discount-scholarship') runDiscount()
  }, [activeTab, loadedTabs, runCollectionSummary, runOutstanding, runDefaulters, runDaily, runMonthly, runDiscount])

  if (!can('fees.report.read')) return <AccessDenied />

  const canExport = can('fees.report.export')

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Reports" description="Collection, outstanding, and defaulter reports across your student fees" />

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ReportTab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="collection-summary" className="gap-2"><Wallet className="h-4 w-4" />Collection Summary</TabsTrigger>
          <TabsTrigger value="outstanding" className="gap-2"><AlertTriangle className="h-4 w-4" />Outstanding</TabsTrigger>
          <TabsTrigger value="defaulters" className="gap-2"><AlertTriangle className="h-4 w-4" />Defaulters</TabsTrigger>
          <TabsTrigger value="daily-collection" className="gap-2"><CalendarDays className="h-4 w-4" />Daily Collection</TabsTrigger>
          <TabsTrigger value="monthly-collection" className="gap-2"><CalendarRange className="h-4 w-4" />Monthly Collection</TabsTrigger>
          <TabsTrigger value="discount-scholarship" className="gap-2"><BadgePercent className="h-4 w-4" />Discounts & Scholarships</TabsTrigger>
        </TabsList>

        {/* Collection Summary */}
        <TabsContent value="collection-summary" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <FeeReportFilters
                values={collectionFilters}
                onChange={setCollectionFilters}
                onRun={runCollectionSummary}
                loading={collectionLoading}
                extra={canExport && (
                  <div className="flex gap-2 ml-auto">
                    {(['pdf', 'csv', 'xlsx'] as const).map(fmt => (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        disabled={exportingFormat !== null}
                        onClick={() => handleExport(fmt)}
                      >
                        {exportingFormat === fmt ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {fmt.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {collectionLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={collectionData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outstanding */}
        <TabsContent value="outstanding" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <FeeReportFilters values={outstandingFilters} onChange={setOutstandingFilters} onRun={runOutstanding} loading={outstandingLoading} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {outstandingLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={outstandingData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defaulters */}
        <TabsContent value="defaulters" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <FeeReportFilters values={defaultersFilters} onChange={setDefaultersFilters} onRun={runDefaulters} loading={defaultersLoading} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {defaultersLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={defaultersData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Collection */}
        <TabsContent value="daily-collection" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <FeeReportFilters values={dailyFilters} onChange={setDailyFilters} onRun={runDaily} loading={dailyLoading} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {dailyLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={dailyData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Collection */}
        <TabsContent value="monthly-collection" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <FeeReportFilters values={monthlyFilters} onChange={setMonthlyFilters} onRun={runMonthly} loading={monthlyLoading} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {monthlyLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={monthlyData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discount & Scholarship Summary */}
        <TabsContent value="discount-scholarship" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <FeeReportFilters values={discountFilters} onChange={setDiscountFilters} onRun={runDiscount} loading={discountLoading} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {discountLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ReportView data={discountData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
