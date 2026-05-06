import { cn } from '@/lib/utils'

interface ColorDotProps {
  color: string
  size?: 'sm' | 'md'
  className?: string
}

const sizeMap = { sm: 'h-2.5 w-2.5', md: 'h-3.5 w-3.5' }

function ColorDot({ color, size = 'sm', className }: ColorDotProps) {
  return <span className={cn('inline-block rounded-full shrink-0', sizeMap[size], className)} style={{ backgroundColor: color }} />
}

export { ColorDot }
