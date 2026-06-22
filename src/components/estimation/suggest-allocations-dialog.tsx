'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSuggestAllocations, type SuggestData, type SuggestScope } from '@/hooks/use-suggest-allocations'
import type { RolloutDTO, RoleConfigDTO } from '@/hooks/use-estimation'
import { formatCurrency } from '@/lib/utils'

interface Props {
  opportunityId: string
  currency: string
  rollouts: RolloutDTO[]
  roles: RoleConfigDTO[]
  onApply: (allocs: { phaseId: string; roleConfigId: string; percentage: number }[]) => void
}

function parseScope(v: string): SuggestScope {
  if (v.startsWith('rollout:')) return { type: 'rollout', rolloutId: v.slice('rollout:'.length) }
  if (v.startsWith('phase:')) return { type: 'phase', phaseId: v.slice('phase:'.length) }
  return { type: 'project' }
}

function scopeHasPhases(v: string, rollouts: RolloutDTO[]): boolean {
  if (v.startsWith('rollout:')) {
    const id = v.slice('rollout:'.length)
    return (rollouts.find((r) => r.id === id)?.phases.length ?? 0) > 0
  }
  if (v.startsWith('phase:')) return true
  return rollouts.some((r) => r.phases.length > 0)
}

export function SuggestAllocationsDialog({ opportunityId, currency, rollouts, roles, onApply }: Props) {
  const suggest = useSuggestAllocations(opportunityId)
  const [open, setOpen] = useState(false)
  const [targetCost, setTargetCost] = useState('')
  const [scope, setScope] = useState('project')
  const [guidance, setGuidance] = useState('')
  const [result, setResult] = useState<SuggestData | null>(null)

  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: 'project', label: 'Whole project' }]
    for (const ro of rollouts) opts.push({ value: `rollout:${ro.id}`, label: `Rollout: ${ro.name}` })
    for (const ro of rollouts)
      for (const p of ro.phases) opts.push({ value: `phase:${p.id}`, label: `${ro.name} · ${p.name}` })
    return opts
  }, [rollouts])

  function reset() {
    setResult(null)
    setGuidance('')
    setTargetCost('')
    setScope('project')
  }

  const target = Number(targetCost)
  const canSubmit =
    roles.length > 0 && target > 0 && scopeHasPhases(scope, rollouts) && !suggest.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setResult(null)
    try {
      const data = await suggest.mutateAsync({
        targetCost: target,
        scope: parseScope(scope),
        guidance: guidance.trim() || undefined,
      })
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate suggestion')
    }
  }

  function handleApply() {
    if (!result) return
    onApply(result.allocations)
    setOpen(false)
    reset()
  }

  const variancePctRounded = result ? Math.round(result.variancePct * 100) : 0
  const offTarget = result ? Math.abs(result.variancePct) > 0.1 : false

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Sparkles className="h-4 w-4" />
            Suggest with AI
          </Button>
        }
      />
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Suggest allocations with AI</DialogTitle>
          <DialogDescription>
            Claude reads the scope and your roles and phases, then proposes allocation percentages to
            approach a target cost. Review before applying.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-cost">Target cost ({currency})</Label>
              <Input
                id="target-cost"
                type="number"
                min={0}
                value={targetCost}
                onChange={(e) => setTargetCost(e.target.value)}
                placeholder="e.g. 1200000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="scope">Scope</Label>
              <Select value={scope} onValueChange={(v) => v && setScope(v)}>
                <SelectTrigger id="scope" className="mt-1 w-full" aria-label="Scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="guidance">Guidance (optional)</Label>
            <Textarea
              id="guidance"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              rows={2}
              placeholder="e.g. lean on functional consultants; keep PM light"
              className="mt-1"
            />
          </div>

          {roles.length === 0 && (
            <p className="text-sm text-destructive">Add at least one role first.</p>
          )}
          {roles.length > 0 && !scopeHasPhases(scope, rollouts) && (
            <p className="text-sm text-destructive">The selected scope has no phases.</p>
          )}

          <Button type="submit" disabled={!canSubmit}>
            {suggest.isPending ? 'Generating…' : 'Generate suggestion'}
          </Button>
        </form>

        {result && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Estimated fee</span>
              <span className="text-sm font-medium">
                {formatCurrency(result.achievedCost, currency)} vs {formatCurrency(result.targetCost, currency)} target
                {' · '}
                <span className={offTarget ? 'text-amber-600' : 'text-green-600'}>
                  {variancePctRounded > 0 ? '+' : ''}
                  {variancePctRounded}%
                </span>
              </span>
            </div>
            {offTarget && (
              <p className="text-xs text-muted-foreground">
                Staffing is capped at 100% per role and phase. Raise the target or widen the scope to
                close the gap.
              </p>
            )}
            <p className="text-sm whitespace-pre-line">{result.rationale}</p>
            {result.assumptions.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                Discard
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply to working copy
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
