import { cn } from '@/lib/utils'
import type { RagStatus } from '@/lib/constants/benchmarks'

const DOT: Record<RagStatus, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

const LABEL: Record<RagStatus, string> = {
  green: 'On target',
  amber: 'Below target',
  red: 'At risk',
}

/** A small Red/Amber/Green status dot, optionally with its label. */
export function RagIndicator({
  status,
  showLabel = false,
  className,
}: {
  status: RagStatus
  showLabel?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DOT[status])} aria-hidden />
      {showLabel ? (
        <span className="text-xs text-muted-foreground">{LABEL[status]}</span>
      ) : (
        <span className="sr-only">{LABEL[status]}</span>
      )}
    </span>
  )
}
