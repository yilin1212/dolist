import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(({ title, subtitle, children, className }, ref) => (
  <div ref={ref} className={cn('flex items-start justify-between mb-6', className)}>
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
))
PageHeader.displayName = 'PageHeader'

export { PageHeader }
