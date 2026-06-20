import React from "react"
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, action, children, className }: PageHeaderProps) {
  const aside = action ?? children
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {aside && <div className="flex items-center gap-3">{aside}</div>}
    </div>
  )
}
