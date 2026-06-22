import { z } from 'zod'

/**
 * The serialized estimation working copy stored on an EstimationRevision.
 * Roles and allocations are keyed by `roleName` (a natural key within an
 * opportunity, @@unique([opportunityId, roleName])) so the snapshot survives the
 * cuid regeneration that happens when restore recreates the live rows.
 */
const snapshotRole = z.object({
  roleName: z.string(),
  rate: z.number(),
  costRate: z.number(),
  rateUnit: z.string(),
  hoursPerDay: z.number().int(),
  sortOrder: z.number().int(),
})

const snapshotAllocation = z.object({
  roleName: z.string(),
  percentage: z.number(),
})

const snapshotPhase = z.object({
  name: z.string(),
  colour: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  workingDays: z.number().int(),
  sortOrder: z.number().int(),
  goLives: z.array(z.string()),
  allocations: z.array(snapshotAllocation),
})

const snapshotRollout = z.object({
  name: z.string(),
  colour: z.string(),
  sortOrder: z.number().int(),
  phases: z.array(snapshotPhase),
})

export const revisionSnapshotSchema = z.object({
  version: z.literal(1),
  currency: z.string(),
  roles: z.array(snapshotRole),
  rollouts: z.array(snapshotRollout),
})

export type RevisionSnapshot = z.infer<typeof revisionSnapshotSchema>

export const createRevisionSchema = z.object({
  label: z.string().min(1).max(120).trim(),
  kind: z.enum(['manual', 'ai']).default('manual'),
  note: z.string().max(2000).optional(),
  // When set, clone this revision's stored snapshot verbatim instead of
  // snapshotting the current working copy.
  fromRevisionId: z.string().min(1).optional(),
})

export const updateRevisionSchema = z.object({
  label: z.string().min(1).max(120).trim().optional(),
  note: z.string().max(2000).nullable().optional(),
})
