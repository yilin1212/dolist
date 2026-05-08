import { memo } from 'react'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  className?: string
}

const ProgressRing = memo(function ProgressRing({ progress, size = 120, strokeWidth = 6, color = '#2383E2', className }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - Math.min(Math.max(progress, 0), 1) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('transform -rotate-90', className)}
      role="progressbar"
      aria-valuenow={Math.round(Math.min(Math.max(progress, 0), 1) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E9E9E7" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-500 ease-in-out"
      />
    </svg>
  )
})

export { ProgressRing }
