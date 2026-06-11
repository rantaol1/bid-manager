'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/common/error-message'
import { CostSummaryCards } from '@/components/estimation/cost-summary-cards'
import { MonitoringCards } from '@/components/estimation/monitoring-cards'
import { RoleConfigPanel } from '@/components/estimation/role-config-panel'
import { PhaseBuilder } from '@/components/estimation/phase-builder'
import { AllocationMatrix, allocKey } from '@/components/estimation/allocation-matrix'
import { useRoles, useRollouts, useEstimationMutations } from '@/hooks/use-estimation'
import { useProposalData } from '@/hooks/use-proposal-data'
import { SectionPreview } from '@/components/preview/section-preview'
import { PreviewPanel } from '@/components/preview/preview-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeEstimation, type EstRollout } from '@/lib/estimation'
import type { EstimationSummary } from '@/types'

const ESTIMATION_SLIDES: Array<{ id: string; label: string }> = [
  { id: 'team', label: 'Proposed delivery team' },
  { id: 'commercials', label: 'Indicative investment' },
]

export function EstimationTab({
  opportunityId,
  currency = 'EUR',
  expectedValue,
}: {
  opportunityId: string
  currency?: string
  expectedValue: string | null
}) {
  const rolesQuery = useRoles(opportunityId)
  const rolloutsQuery = useRollouts(opportunityId)
  const mutations = useEstimationMutations(opportunityId)
  const { data: proposalData } = useProposalData(opportunityId)

  // Build the allocation draft from server data; reset it when rollouts change (render-phase reset).
  const buildDraft = (data: typeof rolloutsQuery.data): Record<string, string> => {
    const next: Record<string, string> = {}
    for (const rollout of data ?? []) {
      for (const phase of rollout.phases) {
        for (const alloc of phase.allocations) {
          next[allocKey(phase.id, alloc.roleConfigId)] = String(Number(alloc.percentage))
        }
      }
    }
    return next
  }
  const [prevRollouts, setPrevRollouts] = useState(rolloutsQuery.data)
  const [draft, setDraft] = useState<Record<string, string>>(() => buildDraft(rolloutsQuery.data))
  if (rolloutsQuery.data !== prevRollouts) {
    setPrevRollouts(rolloutsQuery.data)
    setDraft(buildDraft(rolloutsQuery.data))
  }

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data])
  const rollouts = useMemo(() => rolloutsQuery.data ?? [], [rolloutsQuery.data])

  const summary: EstimationSummary = useMemo(() => {
    const estRollouts: EstRollout[] = rollouts.map((ro) => ({
      id: ro.id,
      name: ro.name,
      colour: ro.colour,
      sortOrder: ro.sortOrder,
      phases: ro.phases.map((p) => ({
        id: p.id,
        name: p.name,
        rolloutId: p.rolloutId,
        startDate: p.startDate,
        endDate: p.endDate,
        workingDays: p.workingDays,
        sortOrder: p.sortOrder,
        goLives: p.goLives,
        allocations: roles
          .map((r) => ({ roleConfigId: r.id, percentage: Number(draft[allocKey(p.id, r.id)] ?? 0) }))
          .filter((a) => a.percentage > 0),
      })),
    }))
    return computeEstimation({
      roleConfigs: roles.map((r) => ({
        id: r.id,
        roleName: r.roleName,
        rate: Number(r.rate),
        costRate: Number(r.costRate),
        rateUnit: r.rateUnit,
        hoursPerDay: r.hoursPerDay,
        sortOrder: r.sortOrder,
      })),
      rollouts: estRollouts,
      currency,
    })
  }, [roles, rollouts, draft, currency])

  function onAllocChange(phaseId: string, roleId: string, value: string) {
    setDraft((prev) => ({ ...prev, [allocKey(phaseId, roleId)]: value }))
  }

  async function onSaveAllocations() {
    const allocations: { phaseId: string; roleConfigId: string; percentage: number }[] = []
    for (const rollout of rollouts) {
      for (const phase of rollout.phases) {
        for (const role of roles) {
          const raw = draft[allocKey(phase.id, role.id)]
          allocations.push({ phaseId: phase.id, roleConfigId: role.id, percentage: Number(raw) || 0 })
        }
      }
    }
    try {
      await mutations.saveAllocations.mutateAsync(allocations)
      toast.success('Allocations saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save allocations')
    }
  }

  if (rolesQuery.isLoading || rolloutsQuery.isLoading) {
    return <Skeleton className="h-96 w-full" />
  }
  if (rolesQuery.error || rolloutsQuery.error) {
    return <ErrorMessage message="Failed to load estimation data" />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          render={<a href={`/api/opportunities/${opportunityId}/export/xlsx`} />}
        >
          <Download className="h-4 w-4" />
          Export XLSX
        </Button>
      </div>

      <MonitoringCards summary={summary} expectedValue={expectedValue ? Number(expectedValue) : null} />

      <CostSummaryCards summary={summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RoleConfigPanel
          roles={roles}
          saving={mutations.saveRoles.isPending}
          onSave={(r) => mutations.saveRoles.mutateAsync(r).then(() => undefined)}
        />
        <PhaseBuilder rollouts={rollouts} mutations={mutations} />
      </div>

      <AllocationMatrix
        rollouts={rollouts}
        roles={roles}
        draft={draft}
        onChange={onAllocChange}
        onSave={onSaveAllocations}
        saving={mutations.saveAllocations.isPending}
      />

      {proposalData && (
        <Card>
          <CardHeader>
            <CardTitle>Slide previews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ESTIMATION_SLIDES.map((s) => (
              <PreviewPanel key={s.id} label={s.label}>
                <SectionPreview sectionId={s.id} data={{ ...proposalData, summary }} />
              </PreviewPanel>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
