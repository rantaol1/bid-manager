'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import type { RolloutDTO, PhaseDTO } from '@/hooks/use-estimation'
import type { useEstimationMutations } from '@/hooks/use-estimation'

type Mutations = ReturnType<typeof useEstimationMutations>

const DEFAULT_COLOURS = ['#E87722', '#2196F3', '#2EB872', '#9C27B0']

function dateValue(iso: string) {
  return iso.slice(0, 10)
}

function PhaseRow({ phase, mutations }: { phase: PhaseDTO; mutations: Mutations }) {
  const [name, setName] = useState(phase.name)
  const [start, setStart] = useState(dateValue(phase.startDate))
  const [end, setEnd] = useState(dateValue(phase.endDate))

  async function save(patch: { name?: string; startDate?: string; endDate?: string }) {
    try {
      await mutations.updatePhase.mutateAsync({ id: phase.id, ...patch })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update phase')
    }
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b py-2 last:border-0">
      <Input
        className="col-span-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name !== phase.name && save({ name })}
      />
      <Input
        type="date"
        className="col-span-3"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        onBlur={() => start !== dateValue(phase.startDate) && save({ startDate: start })}
      />
      <Input
        type="date"
        className="col-span-3"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        onBlur={() => end !== dateValue(phase.endDate) && save({ endDate: end })}
      />
      <span className="col-span-1 text-center text-sm text-muted-foreground">{phase.workingDays}d</span>
      <div className="col-span-1 flex justify-end">
        <ConfirmDialog
          title="Delete phase?"
          description={`Delete "${phase.name}" and its allocations.`}
          confirmLabel="Delete"
          onConfirm={async () => {
            try {
              await mutations.deletePhase.mutateAsync(phase.id)
              toast.success('Phase deleted')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to delete phase')
            }
          }}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Delete phase">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          }
        />
      </div>
    </div>
  )
}

function AddPhaseDialog({ rolloutId, nextSort, mutations }: { rolloutId: string; nextSort: number; mutations: Mutations }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError('Name, start and end dates are required')
      return
    }
    try {
      await mutations.createPhase.mutateAsync({
        rolloutId,
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        sortOrder: nextSort,
      })
      toast.success('Phase added')
      setForm({ name: '', startDate: '', endDate: '' })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add phase')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <CalendarPlus className="h-4 w-4" />
            Add phase
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add phase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="grid gap-4">
          <div>
            <Label htmlFor="phase-name">Name</Label>
            <Input id="phase-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phase-start">Start</Label>
              <Input id="phase-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phase-end">End</Label>
              <Input id="phase-end" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-1" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutations.createPhase.isPending}>
              {mutations.createPhase.isPending ? 'Adding…' : 'Add phase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddRolloutDialog({ nextSort, mutations }: { nextSort: number; mutations: Mutations }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [colour, setColour] = useState(DEFAULT_COLOURS[nextSort % DEFAULT_COLOURS.length])
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    try {
      await mutations.createRollout.mutateAsync({ name: name.trim(), colour, sortOrder: nextSort })
      toast.success('Rollout added')
      setName('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rollout')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            Add rollout
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add rollout</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="grid gap-4">
          <div>
            <Label htmlFor="rollout-name">Name</Label>
            <Input id="rollout-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="rollout-colour">Colour</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="rollout-colour"
                type="color"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border"
              />
              <span className="text-sm text-muted-foreground">{colour}</span>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutations.createRollout.isPending}>
              {mutations.createRollout.isPending ? 'Adding…' : 'Add rollout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PhaseBuilder({ rollouts, mutations }: { rollouts: RolloutDTO[]; mutations: Mutations }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Rollouts & phases</h3>
        <AddRolloutDialog nextSort={rollouts.length} mutations={mutations} />
      </div>

      {rollouts.length === 0 ? (
        <EmptyState message="No rollouts yet" hint="Add a rollout, then add phases with start and end dates." />
      ) : (
        rollouts.map((rollout) => (
          <Card key={rollout.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: rollout.colour }} />
                {rollout.name}
              </CardTitle>
              <div className="flex gap-2">
                <AddPhaseDialog rolloutId={rollout.id} nextSort={rollout.phases.length} mutations={mutations} />
                <ConfirmDialog
                  title="Delete rollout?"
                  description={`Delete "${rollout.name}" and all its phases.`}
                  confirmLabel="Delete"
                  onConfirm={async () => {
                    try {
                      await mutations.deleteRollout.mutateAsync(rollout.id)
                      toast.success('Rollout deleted')
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to delete rollout')
                    }
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Delete rollout">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent>
              {rollout.phases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No phases yet.</p>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-2 border-b pb-1 text-xs font-medium text-muted-foreground">
                    <span className="col-span-4">Phase</span>
                    <span className="col-span-3">Start</span>
                    <span className="col-span-3">End</span>
                    <span className="col-span-1 text-center">Days</span>
                    <span className="col-span-1" />
                  </div>
                  {rollout.phases.map((phase) => (
                    <PhaseRow key={phase.id} phase={phase} mutations={mutations} />
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
