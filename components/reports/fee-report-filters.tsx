'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { academicsService, type AcademicClass } from '@/lib/services/academics'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RefreshCw } from 'lucide-react'

// Matches the established precedent in app/dashboard/fees/structures — no
// academic-year list API is wired up anywhere in the app yet, so this mirrors
// that same fixed 3-year set rather than introducing a new pattern.
const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027']

export interface FeeReportFilterValues {
  academicYear: string
  classId: string
  from: string
  to: string
}

export function defaultFeeReportFilters(): FeeReportFilterValues {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    academicYear: '2025-2026',
    classId: '',
    from: firstOfMonth.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  }
}

interface FeeReportFiltersProps {
  values: FeeReportFilterValues
  onChange: (values: FeeReportFilterValues) => void
  onRun: () => void
  loading?: boolean
  runDisabled?: boolean
  extra?: ReactNode
}

export function FeeReportFilters({ values, onChange, onRun, loading, runDisabled, extra }: FeeReportFiltersProps) {
  const [classes, setClasses] = useState<AcademicClass[]>([])

  useEffect(() => {
    academicsService.getClasses({ limit: 100 }).then(res => setClasses(res.data))
  }, [])

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label>Academic Year</Label>
        <Select value={values.academicYear} onValueChange={v => onChange({ ...values, academicYear: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 min-w-[200px]">
        <Label>Class</Label>
        <Select value={values.classId || 'all'} onValueChange={v => onChange({ ...values, classId: v === 'all' ? '' : v })}>
          <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>From</Label>
        <Input type="date" value={values.from} onChange={e => onChange({ ...values, from: e.target.value })} className="w-44" />
      </div>
      <div className="space-y-1.5">
        <Label>To</Label>
        <Input type="date" value={values.to} onChange={e => onChange({ ...values, to: e.target.value })} className="w-44" />
      </div>
      <Button onClick={onRun} disabled={loading || runDisabled}>
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
        Run Report
      </Button>
      {extra}
    </div>
  )
}
