import { prisma } from '@/lib/prisma'
import type { EstRoleConfig, EstRollout } from '@/lib/estimation'
import type { TimelineConfig, TimelineGroup } from '@/types'
import { DEFAULT_ROADMAP_BG } from '@/lib/roadmap-style'

export interface LoadedEstimation {
  opportunity: {
    id: string
    name: string
    currency: string
    customerName: string
  }
  roleConfigs: EstRoleConfig[]
  rollouts: EstRollout[]
  /** Roadmap card background colour (#RRGGBB), from the opportunity timeline config. */
  background: string
  /** Editable bracket groups from the opportunity timeline config. */
  groups: TimelineGroup[]
  /** Per-go-live vertical offsets (px), keyed by `${phaseId}:${yyyy-MM-dd}`. */
  goLiveOffsets: Record<string, number>
}

/** Load and normalise all estimation data for an opportunity into plain shapes. */
export async function loadEstimation(opportunityId: string): Promise<LoadedEstimation | null> {
  const opp = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      customer: { select: { name: true } },
      roleConfigs: { orderBy: { sortOrder: 'asc' } },
      rollouts: {
        orderBy: { sortOrder: 'asc' },
        include: { phases: { orderBy: { sortOrder: 'asc' }, include: { allocations: true } } },
      },
    },
  })

  if (!opp) return null

  const timelineConfig = (opp.timelineConfig ?? null) as TimelineConfig | null
  const background = timelineConfig?.background ?? DEFAULT_ROADMAP_BG
  const groups = timelineConfig?.groups ?? []
  const goLiveOffsets = timelineConfig?.goLiveOffsets ?? {}

  const roleConfigs: EstRoleConfig[] = opp.roleConfigs.map((r) => ({
    id: r.id,
    roleName: r.roleName,
    rate: Number(r.rate),
    costRate: Number(r.costRate),
    rateUnit: r.rateUnit,
    hoursPerDay: r.hoursPerDay,
    sortOrder: r.sortOrder,
  }))

  const rollouts: EstRollout[] = opp.rollouts.map((ro) => ({
    id: ro.id,
    name: ro.name,
    colour: ro.colour,
    sortOrder: ro.sortOrder,
    phases: ro.phases.map((p) => ({
      id: p.id,
      name: p.name,
      rolloutId: p.rolloutId,
      colour: p.colour,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      workingDays: p.workingDays,
      sortOrder: p.sortOrder,
      goLives: p.goLives.map((d) => d.toISOString()),
      allocations: p.allocations.map((a) => ({
        roleConfigId: a.roleConfigId,
        percentage: Number(a.percentage),
      })),
    })),
  }))

  return {
    opportunity: {
      id: opp.id,
      name: opp.name,
      currency: opp.currency,
      customerName: opp.customer.name,
    },
    roleConfigs,
    rollouts,
    background,
    groups,
    goLiveOffsets,
  }
}
