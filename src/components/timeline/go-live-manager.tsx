'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import type { RolloutDTO, PhaseDTO } from '@/hooks/use-estimation'
import type { useEstimationMutations } from '@/hooks/use-estimation'

type Mutations = ReturnType<typeof useEstimationMutations>

function PhaseGoLives({ phase, mutations }: { phase: PhaseDTO; mutations: Mutations }) {
  const [newDate, setNewDate] = useState('')

  async function save(goLives: string[]) {
    try {
      await mutations.updatePhase.mutateAsync({ id: phase.id, goLives })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update go-lives')
    }
  }

  const dates = phase.goLives.map((d) => d.slice(0, 10))

  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
      <span className="w-40 shrink-0 text-sm font-medium">{phase.name}</span>
      {dates.map((d) => (
        <span key={d} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
          {format(new Date(d), 'd MMM yyyy')}
          <button
            type="button"
            aria-label="Remove go-live"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => save(dates.filter((x) => x !== d))}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 w-40" />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Add go-live"
          onClick={() => {
            if (!newDate || dates.includes(newDate)) return
            save([...dates, newDate])
            setNewDate('')
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function GoLiveManager({ rollouts, mutations }: { rollouts: RolloutDTO[]; mutations: Mutations }) {
  const phases = rollouts.flatMap((ro) => ro.phases)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Go-live milestones</CardTitle>
      </CardHeader>
      <CardContent>
        {phases.length === 0 ? (
          <EmptyState message="No phases yet" hint="Add phases in the Estimation tab first." />
        ) : (
          <div>
            {phases.map((phase) => (
              <PhaseGoLives key={phase.id} phase={phase} mutations={mutations} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
