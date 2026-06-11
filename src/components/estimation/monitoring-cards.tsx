'use client'

import { KpiCard } from '@/components/analysis/kpi-card'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { ragForMargin } from '@/lib/constants/benchmarks'
import type { EstimationSummary } from '@/types'

/**
 * Basic project-monitoring KPIs shown above the cost summary on the Estimation tab.
 * Margin is intrinsic to the rate card (fees − delivery cost); the deal value is a
 * pricing comparison only.
 */
export function MonitoringCards({
  summary,
  expectedValue,
}: {
  summary: EstimationSummary
  expectedValue: number | null
}) {
  const { currency } = summary
  const fees = summary.projectTotalCost
  const dealValue = expectedValue != null && expectedValue > 0 ? expectedValue : null
  const variance = dealValue != null && fees > 0 ? (dealValue - fees) / fees : null
  const marginRag = fees > 0 ? ragForMargin(summary.projectMarginPct) : undefined

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Project monitoring</h3>
        <p className="text-xs text-muted-foreground">Margin = fees − delivery cost</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Sell price (fees)" value={formatCurrency(fees, currency)} sublabel="Bill rate × days" />
        <KpiCard
          label="Delivery cost"
          value={formatCurrency(summary.projectInternalCost, currency)}
          sublabel="Cost rate × days"
        />
        <KpiCard
          label="Gross margin"
          value={formatCurrency(summary.projectMargin, currency)}
          sublabel={fees > 0 ? `${formatPercent(summary.projectMarginPct * 100)} of fees` : 'Add allocations'}
          rag={marginRag}
        />
        <KpiCard
          label="Deal value"
          value={dealValue != null ? formatCurrency(dealValue, currency) : '—'}
          sublabel={
            dealValue == null
              ? 'Set a deal value'
              : variance != null
                ? `${variance >= 0 ? '+' : ''}${formatPercent(variance * 100)} vs fees`
                : undefined
          }
        />
      </div>
    </div>
  )
}
