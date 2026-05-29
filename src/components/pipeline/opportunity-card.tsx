'use client'

import Link from 'next/link'
import { Building2, CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { OpportunityDTO } from '@/hooks/use-opportunities'

export function OpportunityCard({ opportunity }: { opportunity: OpportunityDTO }) {
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/opportunities/${opportunity.id}`} className="block font-medium hover:text-magenta">
        {opportunity.name}
      </Link>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        {opportunity.customer.name}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {opportunity.expectedValue
            ? formatCurrency(Number(opportunity.expectedValue), opportunity.currency)
            : '—'}
        </span>
        {opportunity.probability != null && (
          <Badge variant="secondary" className="text-xs">
            {opportunity.probability}%
          </Badge>
        )}
      </div>
      {opportunity.closeDate && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {new Date(opportunity.closeDate).toLocaleDateString('en-IE')}
        </div>
      )}
      {opportunity.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {opportunity.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
