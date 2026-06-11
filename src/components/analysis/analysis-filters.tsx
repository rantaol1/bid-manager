'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RolloutDTO } from '@/hooks/use-estimation'

interface Props {
  rollouts: RolloutDTO[]
  rolloutId: string
  phaseId: string
  onRolloutChange: (value: string) => void
  onPhaseChange: (value: string) => void
}

/** Cascading workstream → phase filter for the Analysis tab. */
export function AnalysisFilters({ rollouts, rolloutId, phaseId, onRolloutChange, onPhaseChange }: Props) {
  const selectedRollout = rollouts.find((r) => r.id === rolloutId)
  // Phase options are scoped to the chosen workstream; "all" lists every phase (prefixed by rollout).
  const phaseOptions =
    rolloutId === 'all'
      ? rollouts.flatMap((r) => r.phases.map((p) => ({ id: p.id, label: `${r.name} · ${p.name}` })))
      : (selectedRollout?.phases ?? []).map((p) => ({ id: p.id, label: p.name }))

  const isFiltered = rolloutId !== 'all' || phaseId !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filter</span>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Workstream</span>
        <Select value={rolloutId} onValueChange={(v) => v && onRolloutChange(v)}>
          <SelectTrigger size="sm" className="w-44" aria-label="Filter by workstream">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All workstreams</SelectItem>
            {rollouts.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Phase</span>
        <Select value={phaseId} onValueChange={(v) => v && onPhaseChange(v)}>
          <SelectTrigger size="sm" className="w-56" aria-label="Filter by phase">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All phases</SelectItem>
            {phaseOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onRolloutChange('all')
            onPhaseChange('all')
          }}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  )
}
