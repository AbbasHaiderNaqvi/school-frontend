import { ShieldOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AccessDeniedProps {
  message?: string
}

export function AccessDenied({ message = 'You do not have permission to access this page.' }: AccessDeniedProps) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldOff className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <p className="text-lg font-semibold">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}
