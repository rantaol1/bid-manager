import type { Prisma } from '@prisma/client'
import { computeEstimation } from '@/lib/estimation'
import type { LoadedEstimation } from '@/lib/estimation-data'
import type { EstimationSummary } from '@/types'
import type { RevisionSnapshot } from '@/lib/schemas/revisions'

/**
 * Serialise the loaded estimation working copy into a roleName-keyed snapshot.
 * `loadEstimation` already returns plain numbers, so no Decimal handling here.
 */
export function buildSnapshot(loaded: LoadedEstimation): RevisionSnapshot {
  const idToRoleName = new Map(loaded.roleConfigs.map((r) => [r.id, r.roleName]))
  return {
    version: 1,
    currency: loaded.opportunity.currency,
    roles: loaded.roleConfigs.map((r) => ({
      roleName: r.roleName,
      rate: r.rate,
      costRate: r.costRate,
      rateUnit: r.rateUnit,
      hoursPerDay: r.hoursPerDay,
      sortOrder: r.sortOrder,
    })),
    rollouts: loaded.rollouts.map((ro) => ({
      name: ro.name,
      colour: ro.colour,
      sortOrder: ro.sortOrder,
      phases: ro.phases.map((p) => ({
        name: p.name,
        colour: p.colour ?? null,
        startDate: p.startDate,
        endDate: p.endDate,
        workingDays: p.workingDays,
        sortOrder: p.sortOrder,
        goLives: p.goLives,
        allocations: p.allocations
          .map((a) => ({ roleName: idToRoleName.get(a.roleConfigId), percentage: a.percentage }))
          .filter((a): a is { roleName: string; percentage: number } => a.roleName !== undefined),
      })),
    })),
  }
}

/** Compute the cost summary for a loaded estimation (stored alongside the snapshot). */
export function buildSummary(loaded: LoadedEstimation): EstimationSummary {
  return computeEstimation({
    roleConfigs: loaded.roleConfigs,
    rollouts: loaded.rollouts,
    currency: loaded.opportunity.currency,
  })
}

/**
 * Overwrite an opportunity's live estimation (roles, rollouts, phases, allocations)
 * from a snapshot. Must run inside a `prisma.$transaction` so a failure rolls back
 * the whole working copy. Allocations referencing a role absent from the snapshot
 * are skipped, and duplicates are de-duped to respect @@unique([phaseId, roleConfigId]).
 */
export async function restoreTransaction(
  tx: Prisma.TransactionClient,
  opportunityId: string,
  snapshot: RevisionSnapshot
): Promise<void> {
  // 1. Wipe the working copy. Deleting rollouts cascades phases -> allocations,
  //    so every allocation is gone before we remove the roles they referenced.
  await tx.rollout.deleteMany({ where: { opportunityId } })
  await tx.roleConfig.deleteMany({ where: { opportunityId } })

  // 2. Recreate roles; build roleName -> new id.
  const roleNameToId = new Map<string, string>()
  for (const r of snapshot.roles) {
    const created = await tx.roleConfig.create({
      data: {
        opportunityId,
        roleName: r.roleName,
        rate: r.rate,
        costRate: r.costRate,
        rateUnit: r.rateUnit,
        hoursPerDay: r.hoursPerDay,
        sortOrder: r.sortOrder,
      },
    })
    roleNameToId.set(r.roleName, created.id)
  }

  // 3. Recreate rollouts -> phases -> allocations, remapping roleName -> new id.
  for (const ro of snapshot.rollouts) {
    const rollout = await tx.rollout.create({
      data: { opportunityId, name: ro.name, colour: ro.colour, sortOrder: ro.sortOrder },
    })
    for (const p of ro.phases) {
      const phase = await tx.phase.create({
        data: {
          rolloutId: rollout.id,
          name: p.name,
          colour: p.colour ?? null,
          startDate: new Date(p.startDate),
          endDate: new Date(p.endDate),
          workingDays: p.workingDays,
          sortOrder: p.sortOrder,
          goLives: p.goLives.map((d) => new Date(d)),
        },
      })
      const seen = new Set<string>()
      const rows: { phaseId: string; roleConfigId: string; percentage: number }[] = []
      for (const a of p.allocations) {
        const roleConfigId = roleNameToId.get(a.roleName)
        if (!roleConfigId || a.percentage <= 0 || seen.has(roleConfigId)) continue
        seen.add(roleConfigId)
        rows.push({ phaseId: phase.id, roleConfigId, percentage: a.percentage })
      }
      if (rows.length) await tx.allocation.createMany({ data: rows })
    }
  }
}
