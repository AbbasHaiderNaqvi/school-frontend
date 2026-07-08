import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { money } from '@/lib/currency'

// None of the report endpoints this renders came with a sample response shape,
// so rather than guess field names, this adapts to whatever comes back: arrays
// of objects become tables, nested objects become sections, scalars become
// stat tiles. Field labels and formatting (currency/date) are inferred from key names.

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

const AMOUNT_HINTS = ['amount', 'balance', 'debit', 'credit', 'total', 'income', 'expense', 'asset', 'liabilit', 'equity', 'net', 'opening', 'closing', 'price', 'value']

function looksLikeAmount(key: string, value: unknown): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false
  if (typeof value === 'string' && isNaN(parseFloat(value))) return false
  const k = key.toLowerCase()
  return AMOUNT_HINTS.some(hint => k.includes(hint))
}

function looksLikeDate(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false
  const k = key.toLowerCase()
  return (k.includes('date') || k === 'asof') && !isNaN(Date.parse(value))
}

function ReportCell({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>
  }
  if (looksLikeDate(fieldKey, value)) {
    return <span>{new Date(value as string).toLocaleDateString()}</span>
  }
  if (looksLikeAmount(fieldKey, value)) {
    return <span className="font-mono tabular-nums">{money(value as string | number)}</span>
  }
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>
  if (typeof value === 'object') return <span className="text-muted-foreground text-xs">{JSON.stringify(value)}</span>
  return <span>{String(value)}</span>
}

function ReportTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data for this period.</p>
  }
  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach(k => set.add(k))
    return set
  }, new Set<string>()))

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(c => (
              <TableHead key={c} className={looksLikeAmount(c, rows[0][c]) ? 'text-right' : ''}>
                {humanizeKey(c)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map(c => (
                <TableCell key={c} className={looksLikeAmount(c, row[c]) ? 'text-right font-medium' : ''}>
                  <ReportCell fieldKey={c} value={row[c]} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ReportSections({ data, depth = 0 }: { data: Record<string, unknown>; depth?: number }) {
  const entries = Object.entries(data)
  const arrayEntries = entries.filter(([, v]) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object')
  const objectEntries = entries.filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
  const scalarEntries = entries.filter(([, v]) => !Array.isArray(v) && (v === null || typeof v !== 'object'))

  return (
    <div className="space-y-6">
      {scalarEntries.length > 0 && (
        <div className={depth === 0 ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' : 'grid gap-3 sm:grid-cols-2'}>
          {scalarEntries.map(([key, value]) => (
            <div key={key} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">{humanizeKey(key)}</div>
              <div className="text-lg font-semibold"><ReportCell fieldKey={key} value={value} /></div>
            </div>
          ))}
        </div>
      )}
      {arrayEntries.map(([key, value]) => (
        <Card key={key}>
          <CardHeader><CardTitle className="text-base">{humanizeKey(key)}</CardTitle></CardHeader>
          <CardContent><ReportTable rows={value as Record<string, unknown>[]} /></CardContent>
        </Card>
      ))}
      {objectEntries.map(([key, value]) => (
        <Card key={key}>
          <CardHeader><CardTitle className="text-base">{humanizeKey(key)}</CardTitle></CardHeader>
          <CardContent><ReportSections data={value as Record<string, unknown>} depth={depth + 1} /></CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ReportView({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <p className="text-sm text-muted-foreground text-center py-10">No data returned for this report.</p>
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">No data for this period.</p>
    if (typeof data[0] !== 'object') return <p className="text-sm">{data.join(', ')}</p>
    return <ReportTable rows={data as Record<string, unknown>[]} />
  }
  if (typeof data === 'object') {
    return <ReportSections data={data as Record<string, unknown>} />
  }
  return <p className="text-sm">{String(data)}</p>
}
