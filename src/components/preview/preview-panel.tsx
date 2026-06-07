'use client'

import { useState } from 'react'
import { ChevronDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Collapsible wrapper for a slide preview. Collapsed by default. */
export function PreviewPanel({
  children,
  label = 'Preview',
  defaultOpen = false,
}: {
  children: React.ReactNode
  label?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setOpen((o) => !o)}>
        <Eye className="h-3.5 w-3.5" />
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}
