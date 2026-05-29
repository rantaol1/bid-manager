'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { ScopeModules, ScopeRequirement, FitGap } from '@/types'

const FIT_GAP_COLOURS: Record<FitGap, string> = {
  fit: '#2EB872',
  partial: '#F59E0B',
  gap: '#EF4444',
}

export function FitGapSummary({
  modules,
  requirements,
}: {
  modules: ScopeModules
  requirements: ScopeRequirement[]
}) {
  const selected = Object.values(modules).filter((m) => m.selected)
  const moduleCounts: Record<FitGap, number> = { fit: 0, partial: 0, gap: 0 }
  for (const m of selected) moduleCounts[(m.fitGap ?? 'fit') as FitGap]++

  const reqCounts: Record<FitGap, number> = { fit: 0, partial: 0, gap: 0 }
  for (const r of requirements) reqCounts[r.fitGap]++

  const cards = [
    { label: 'Modules selected', value: selected.length },
    { label: 'Fit', value: moduleCounts.fit, colour: FIT_GAP_COLOURS.fit },
    { label: 'Partial', value: moduleCounts.partial, colour: FIT_GAP_COLOURS.partial },
    { label: 'Gap', value: moduleCounts.gap, colour: FIT_GAP_COLOURS.gap },
    { label: 'Requirements', value: requirements.length },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              {c.colour && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.colour }} />}
              {c.label}
            </p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
