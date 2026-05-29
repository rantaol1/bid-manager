import { cn } from '@/lib/utils'

interface EmptyStateProps {
  message: string
  hint?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ message, hint, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background p-10 text-center',
        className
      )}
    >
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
