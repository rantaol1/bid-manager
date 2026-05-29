import { differenceInCalendarMonths } from 'date-fns'
import type { EstimationSummary, PhaseCalc, RoleCalc } from '@/types'

/** Plain, serialisable shapes used by both client and server estimation logic. */
export interface EstRoleConfig {
  id: string
  roleName: string
  rate: number
  rateUnit: string
  hoursPerDay: number
  sortOrder: number
}

export interface EstAllocation {
  roleConfigId: string
  percentage: number
}

export interface EstPhase {
  id: string
  name: string
  rolloutId: string
  startDate: string
  endDate: string
  workingDays: number
  sortOrder: number
  goLives: string[]
  allocations: EstAllocation[]
}

export interface EstRollout {
  id: string
  name: string
  colour: string
  sortOrder: number
  phases: EstPhase[]
}

export interface EstimationInput {
  roleConfigs: EstRoleConfig[]
  rollouts: EstRollout[]
  currency: string
}

/** Days a role spends in a phase given its allocation percentage. */
export function daysForAllocation(percentage: number, workingDays: number): number {
  return (percentage / 100) * workingDays
}

/**
 * Compute the full estimation summary from raw role configs and rollouts.
 * Pure and deterministic — safe to use in document generation and tests.
 */
export function computeEstimation({ roleConfigs, rollouts, currency }: EstimationInput): EstimationSummary {
  const rateById = new Map(roleConfigs.map((r) => [r.id, r.rate]))
  const nameById = new Map(roleConfigs.map((r) => [r.id, r.roleName]))

  const phases: PhaseCalc[] = []
  const roleTotals = new Map<string, { days: number; cost: number }>()
  const utilisationValues: number[] = []

  let minStart: Date | null = null
  let maxEnd: Date | null = null

  for (const rollout of rollouts) {
    for (const phase of rollout.phases) {
      let phaseDays = 0
      let phaseCost = 0

      const start = new Date(phase.startDate)
      const end = new Date(phase.endDate)
      if (!isNaN(start.getTime()) && (minStart === null || start.getTime() < minStart.getTime())) {
        minStart = start
      }
      if (!isNaN(end.getTime()) && (maxEnd === null || end.getTime() > maxEnd.getTime())) {
        maxEnd = end
      }

      for (const alloc of phase.allocations) {
        const pct = Number(alloc.percentage)
        if (pct <= 0) continue
        const rate = rateById.get(alloc.roleConfigId) ?? 0
        const days = daysForAllocation(pct, phase.workingDays)
        const cost = days * rate
        phaseDays += days
        phaseCost += cost
        utilisationValues.push(pct)

        const existing = roleTotals.get(alloc.roleConfigId) ?? { days: 0, cost: 0 }
        existing.days += days
        existing.cost += cost
        roleTotals.set(alloc.roleConfigId, existing)
      }

      phases.push({
        phaseId: phase.id,
        phaseName: phase.name,
        rolloutId: rollout.id,
        rolloutName: rollout.name,
        workingDays: phase.workingDays,
        totalDays: phaseDays,
        totalCost: phaseCost,
      })
    }
  }

  const roles: RoleCalc[] = roleConfigs.map((rc) => {
    const totals = roleTotals.get(rc.id) ?? { days: 0, cost: 0 }
    return {
      roleConfigId: rc.id,
      roleName: nameById.get(rc.id) ?? rc.roleName,
      rate: rc.rate,
      totalDays: totals.days,
      totalCost: totals.cost,
    }
  })

  const projectTotalDays = phases.reduce((s, p) => s + p.totalDays, 0)
  const projectTotalCost = phases.reduce((s, p) => s + p.totalCost, 0)
  const averageUtilisation =
    utilisationValues.length > 0
      ? utilisationValues.reduce((s, v) => s + v, 0) / utilisationValues.length
      : 0
  const durationMonths =
    minStart && maxEnd ? Math.max(1, differenceInCalendarMonths(maxEnd, minStart) + 1) : 0

  return {
    phases,
    roles,
    projectTotalDays,
    projectTotalCost,
    averageUtilisation,
    durationMonths,
    currency,
  }
}
