'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/common/error-message'
import { EmptyState } from '@/components/common/empty-state'
import { KpiCard } from '@/components/analysis/kpi-card'
import { AnalysisFilters } from '@/components/analysis/analysis-filters'
import { RoleMixChart, RolloutMixChart } from '@/components/analysis/cost-mix-chart'
import { StaffingChart } from '@/components/analysis/staffing-chart'
import { MarginBar } from '@/components/analysis/margin-bar'
import { useRoles, useRollouts } from '@/hooks/use-estimation'
import { computeEstimation, type EstRoleConfig, type EstRollout } from '@/lib/estimation'
import { computeAnalysis } from '@/lib/analysis'
import { ragForMargin, ragForUtilisation } from '@/lib/constants/benchmarks'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { AnalysisSummary } from '@/types'

/** Sub-label for the deal-value card: weighted value when probability is set, else variance vs fees. */
function dealSubLabel(a: AnalysisSummary, currency: string): string {
  if (a.dealValue == null) return 'Set a deal value'
  if (a.weightedValue != null && a.probability != null) {
    return `Weighted ${formatCurrency(a.weightedValue, currency)} @ ${a.probability}%`
  }
  if (a.dealVsFeesVariance != null) {
    return `${a.dealVsFeesVariance >= 0 ? '+' : ''}${formatPercent(a.dealVsFeesVariance * 100)} vs fees`
  }
  return ''
}

export function AnalysisTab({
  opportunityId,
  currency = 'EUR',
  expectedValue,
  probability,
}: {
  opportunityId: string
  currency?: string
  expectedValue: string | null
  probability: number | null
}) {
  const rolesQuery = useRoles(opportunityId)
  const rolloutsQuery = useRollouts(opportunityId)

  // Filter state: 'all' or a specific rollout/phase id.
  const [rolloutId, setRolloutId] = useState('all')
  const [phaseId, setPhaseId] = useState('all')

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data])
  const rollouts = useMemo(() => rolloutsQuery.data ?? [], [rolloutsQuery.data])

  const roleConfigs = useMemo<EstRoleConfig[]>(
    () =>
      roles.map((r) => ({
        id: r.id,
        roleName: r.roleName,
        rate: Number(r.rate),
        costRate: Number(r.costRate),
        rateUnit: r.rateUnit,
        hoursPerDay: r.hoursPerDay,
        sortOrder: r.sortOrder,
      })),
    [roles]
  )

  // Full estimation input from SAVED allocations (not the Estimation tab's unsaved draft).
  const estRollouts = useMemo<EstRollout[]>(
    () =>
      rollouts.map((ro) => ({
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
          allocations: p.allocations.map((a) => ({
            roleConfigId: a.roleConfigId,
            percentage: Number(a.percentage),
          })),
        })),
      })),
    [rollouts]
  )

  const hasData = useMemo(
    () => estRollouts.some((ro) => ro.phases.some((p) => p.allocations.some((a) => a.percentage > 0))),
    [estRollouts]
  )

  const analysis = useMemo(() => {
    const filtered = estRollouts
      .filter((ro) => rolloutId === 'all' || ro.id === rolloutId)
      .map((ro) => ({ ...ro, phases: ro.phases.filter((p) => phaseId === 'all' || p.id === phaseId) }))
      .filter((ro) => ro.phases.length > 0)
    const summary = computeEstimation({ roleConfigs, rollouts: filtered, currency })
    return computeAnalysis({
      summary,
      rollouts: filtered,
      expectedValue: expectedValue ? Number(expectedValue) : null,
      probability,
    })
  }, [estRollouts, roleConfigs, currency, expectedValue, probability, rolloutId, phaseId])

  if (rolesQuery.isLoading || rolloutsQuery.isLoading) {
    return <Skeleton className="h-96 w-full" />
  }
  if (rolesQuery.error || rolloutsQuery.error) {
    return <ErrorMessage message="Failed to load analysis data" />
  }
  if (!hasData) {
    return (
      <EmptyState
        message="No estimation to analyse yet"
        hint="Add rollouts, phases and allocations in the Estimation tab to see project performance."
      />
    )
  }

  // Changing workstream resets the phase, which may belong to a different workstream.
  const handleRolloutChange = (value: string) => {
    setRolloutId(value)
    setPhaseId('all')
  }

  const marginRag = analysis.fees > 0 ? ragForMargin(analysis.grossMarginPct) : undefined
  const utilRag = ragForUtilisation(analysis.averageUtilisation)

  return (
    <div className="space-y-6">
      <AnalysisFilters
        rollouts={rollouts}
        rolloutId={rolloutId}
        phaseId={phaseId}
        onRolloutChange={handleRolloutChange}
        onPhaseChange={setPhaseId}
      />

      {analysis.totalDays === 0 ? (
        <EmptyState
          message="No data for the selected filter"
          hint="No allocations fall within this workstream/phase — adjust or clear the filter."
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Commercial performance</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Sell price (fees)"
                value={formatCurrency(analysis.fees, currency)}
                sublabel={`${formatCurrency(analysis.blendedBillRate, currency)}/day blended`}
              />
              <KpiCard
                label="Delivery cost"
                value={formatCurrency(analysis.deliveryCost, currency)}
                sublabel={`${formatCurrency(analysis.blendedCostRate, currency)}/day blended`}
              />
              <KpiCard
                label="Gross margin"
                value={formatCurrency(analysis.grossMargin, currency)}
                sublabel={`${formatPercent(analysis.grossMarginPct * 100)} of fees`}
                rag={marginRag}
              />
              <KpiCard
                label="Deal value"
                value={analysis.dealValue != null ? formatCurrency(analysis.dealValue, currency) : '—'}
                sublabel={dealSubLabel(analysis, currency)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Resourcing &amp; schedule</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total effort"
                value={`${analysis.totalDays.toFixed(0)} days`}
                sublabel={`${analysis.roleCount} roles engaged`}
              />
              <KpiCard
                label="Avg team size"
                value={`${analysis.averageTeamFte.toFixed(1)} FTE`}
                sublabel={`Peak ${analysis.peakFte.toFixed(1)} FTE`}
              />
              <KpiCard label="Avg utilisation" value={formatPercent(analysis.averageUtilisation)} rag={utilRag} />
              <KpiCard
                label="Duration"
                value={`${analysis.durationMonths} mo`}
                sublabel={`${analysis.phaseCount} phases · ${analysis.goLiveCount} go-lives`}
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost mix by role</CardTitle>
              </CardHeader>
              <CardContent>
                <RoleMixChart data={analysis.costMixByRole} currency={currency} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost mix by workstream</CardTitle>
              </CardHeader>
              <CardContent>
                <RolloutMixChart data={analysis.costMixByRollout} currency={currency} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staffing profile (FTE by month)</CardTitle>
              </CardHeader>
              <CardContent>
                <StaffingChart data={analysis.staffing} peakFte={analysis.peakFte} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Margin composition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MarginBar
                  fees={analysis.fees}
                  deliveryCost={analysis.deliveryCost}
                  grossMargin={analysis.grossMargin}
                  currency={currency}
                />
                <p className="text-xs text-muted-foreground">
                  {formatPercent(analysis.grossMarginPct * 100)} gross margin on{' '}
                  {formatCurrency(analysis.fees, currency)} fees
                  {analysis.dealVsFeesVariance != null
                    ? ` · deal value ${analysis.dealVsFeesVariance >= 0 ? '+' : ''}${formatPercent(analysis.dealVsFeesVariance * 100)} vs fees`
                    : ''}
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  )
}
