import {
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  max as maxDate,
  min as minDate,
} from 'date-fns'
import { calculateWorkingDays } from '@/lib/utils'
import { daysForAllocation, type EstRollout } from '@/lib/estimation'
import type { AnalysisSummary, EstimationSummary, MixSlice, StaffingBucket } from '@/types'

export interface AnalysisInput {
  /** Pre-computed estimation summary (fees, internal cost, margin, per-role/phase totals). */
  summary: EstimationSummary
  /** Raw rollouts — needed for phase dates and per-phase allocations (the staffing histogram). */
  rollouts: EstRollout[]
  /** Negotiated deal value (expectedValue); null/0 when unset. */
  expectedValue: number | null
  /** Win probability (0..100); null when unset. */
  probability: number | null
}

/**
 * Derive consulting-standard project-performance KPIs from an estimation summary.
 * Pure and deterministic. Margin is intrinsic to the rate card (fees − delivery cost);
 * the deal value is surfaced only as a pricing comparison.
 */
export function computeAnalysis({
  summary,
  rollouts,
  expectedValue,
  probability,
}: AnalysisInput): AnalysisSummary {
  const fees = summary.projectTotalCost
  const deliveryCost = summary.projectInternalCost
  const totalDays = summary.projectTotalDays

  const blendedBillRate = totalDays > 0 ? fees / totalDays : 0
  const blendedCostRate = totalDays > 0 ? deliveryCost / totalDays : 0

  // Deal value: treat null and 0 alike as "unset" for the pricing comparisons.
  const dealValue = expectedValue != null && expectedValue > 0 ? expectedValue : null
  const weightedValue =
    dealValue != null && probability != null ? dealValue * (probability / 100) : null
  const dealVsFeesVariance = dealValue != null && fees > 0 ? (dealValue - fees) / fees : null

  // --- Cost mix by role (fees), from the summary's per-role totals ---
  const costMixByRole: MixSlice[] = summary.roles
    .filter((r) => r.totalDays > 0)
    .map((r) => ({
      id: r.roleConfigId,
      name: r.roleName,
      cost: r.totalCost,
      days: r.totalDays,
      share: fees > 0 ? r.totalCost / fees : 0,
    }))
    .sort((a, b) => b.cost - a.cost)

  // --- Cost mix by workstream/rollout (fees), reducing the per-phase totals ---
  const rolloutColour = new Map(rollouts.map((r) => [r.id, r.colour]))
  const rolloutAgg = new Map<string, { name: string; cost: number; days: number }>()
  for (const p of summary.phases) {
    const agg = rolloutAgg.get(p.rolloutId) ?? { name: p.rolloutName, cost: 0, days: 0 }
    agg.cost += p.totalCost
    agg.days += p.totalDays
    rolloutAgg.set(p.rolloutId, agg)
  }
  const costMixByRollout: MixSlice[] = [...rolloutAgg.entries()]
    .map(([id, agg]) => ({
      id,
      name: agg.name,
      cost: agg.cost,
      days: agg.days,
      share: fees > 0 ? agg.cost / fees : 0,
      colour: rolloutColour.get(id),
    }))
    .filter((s) => s.days > 0)
    .sort((a, b) => b.cost - a.cost)

  // --- Schedule (from phase dates, not the sales close date) ---
  const allPhases = rollouts.flatMap((r) => r.phases)
  const starts: Date[] = []
  const ends: Date[] = []
  let goLiveCount = 0
  for (const p of allPhases) {
    const s = new Date(p.startDate)
    const e = new Date(p.endDate)
    if (!isNaN(s.getTime())) starts.push(s)
    if (!isNaN(e.getTime())) ends.push(e)
    goLiveCount += p.goLives.length
  }
  const projectStartDate = starts.length ? minDate(starts) : null
  const projectEndDate = ends.length ? maxDate(ends) : null
  const projectWorkingDays =
    projectStartDate && projectEndDate ? calculateWorkingDays(projectStartDate, projectEndDate) : 0

  const averageTeamFte = projectWorkingDays > 0 ? totalDays / projectWorkingDays : 0

  // --- Staffing profile over time: bucket person-days by month across overlapping phases ---
  const bucket = new Map<string, number>()
  for (const phase of allPhases) {
    const pStart = new Date(phase.startDate)
    const pEnd = new Date(phase.endDate)
    if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime()) || pEnd < pStart) continue

    const phaseWD = phase.workingDays > 0 ? phase.workingDays : calculateWorkingDays(pStart, pEnd)
    if (phaseWD <= 0) continue

    let phasePersonDays = 0
    for (const a of phase.allocations) {
      if (a.percentage > 0) phasePersonDays += daysForAllocation(a.percentage, phase.workingDays)
    }
    if (phasePersonDays <= 0) continue

    // Distribute the phase's person-days across the months it spans, weighted by working days.
    for (const m of eachMonthOfInterval({ start: startOfMonth(pStart), end: startOfMonth(pEnd) })) {
      const segStart = maxDate([pStart, startOfMonth(m)])
      const segEnd = minDate([pEnd, endOfMonth(m)])
      const monthWD = calculateWorkingDays(segStart, segEnd)
      if (monthWD <= 0) continue
      const key = format(m, 'yyyy-MM')
      bucket.set(key, (bucket.get(key) ?? 0) + phasePersonDays * (monthWD / phaseWD))
    }
  }

  // Materialise a contiguous month axis so gaps render as zero.
  let staffing: StaffingBucket[] = []
  if (projectStartDate && projectEndDate) {
    staffing = eachMonthOfInterval({
      start: startOfMonth(projectStartDate),
      end: startOfMonth(projectEndDate),
    }).map((m) => {
      const personDays = bucket.get(format(m, 'yyyy-MM')) ?? 0
      const monthWD = calculateWorkingDays(startOfMonth(m), endOfMonth(m))
      return {
        month: format(m, 'yyyy-MM'),
        personDays,
        fte: monthWD > 0 ? personDays / monthWD : 0,
      }
    })
  }
  const peakFte = staffing.reduce((mx, b) => Math.max(mx, b.fte), 0)

  return {
    currency: summary.currency,

    fees,
    deliveryCost,
    grossMargin: summary.projectMargin,
    grossMarginPct: summary.projectMarginPct,
    blendedBillRate,
    blendedCostRate,
    dealValue,
    probability,
    weightedValue,
    dealVsFeesVariance,

    totalDays,
    averageTeamFte,
    peakFte,
    averageUtilisation: summary.averageUtilisation,
    roleCount: costMixByRole.length,
    costMixByRole,
    costMixByRollout,

    durationMonths: summary.durationMonths,
    projectStart: projectStartDate ? projectStartDate.toISOString() : null,
    projectEnd: projectEndDate ? projectEndDate.toISOString() : null,
    projectWorkingDays,
    phaseCount: allPhases.length,
    goLiveCount,

    staffing,
  }
}
