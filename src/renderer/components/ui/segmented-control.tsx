import * as React from 'react'
import { cn } from '@/lib/utils'

interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(({ options, value, onChange, className }, ref) => (
  <div ref={ref} className={cn('inline-flex items-center rounded-lg bg-neutral-100 p-1', className)}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          value === option.value
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900'
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
))
SegmentedControl.displayName = 'SegmentedControl'

export { SegmentedControl, type SegmentedControlOption }
