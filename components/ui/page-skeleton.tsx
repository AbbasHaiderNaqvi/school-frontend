import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TableRow, TableCell } from '@/components/ui/table'

// For pages that use their own p-6 wrapper and show a table list
export function TablePageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {/* Header row */}
            <div className="flex gap-4 pb-3 border-b mb-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-8" />
            </div>
            {/* Body rows */}
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-3 border-b last:border-0">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-7 w-7" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// For pages with stat cards + table (students, hr/employees, etc.)
export function StatsTablePageSkeleton({ statCount = 4 }: { statCount?: number }) {
  const colClass =
    statCount <= 2 ? 'grid-cols-2' :
    statCount === 3 ? 'grid-cols-2 md:grid-cols-3' :
    'grid-cols-2 md:grid-cols-4'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Stat cards */}
      <div className={`grid gap-4 ${colClass}`}>
        {Array.from({ length: statCount }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <div className="flex gap-4 pb-3 border-b mb-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-8" />
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-3 border-b last:border-0">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-7 w-7" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// For overview/summary pages (fees, finance, hr overview) — no p-6, uses space-y-6
export function OverviewPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content rows */}
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Skeleton rows to replace inline table loaders
export function SkeletonTableRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className={j === 0 ? 'h-8 w-full' : 'h-4 w-20'} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// Full-page skeleton for auth loading in dashboard layout
export function LayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r bg-sidebar p-4 gap-2">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-px w-full mb-2" />
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
        <div className="mt-auto pt-4">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-64 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-7 w-14" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-1">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
