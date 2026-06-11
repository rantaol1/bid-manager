import { z } from 'zod'

export const saveRolesSchema = z.object({
  roles: z
    .array(
      z.object({
        id: z.string().optional(),
        roleName: z.string().min(1).max(120).trim(),
        rate: z.coerce.number().min(0).max(100000),
        costRate: z.coerce.number().min(0).max(100000).default(0),
        rateUnit: z.enum(['day', 'hour']).default('day'),
        hoursPerDay: z.coerce.number().int().min(1).max(24).default(8),
        sortOrder: z.coerce.number().int().min(0).default(0),
      })
    )
    .max(50),
})

export const createRolloutSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E87722'),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export const updateRolloutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).trim().optional(),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
})

const isoDate = z.string().refine((v) => !isNaN(new Date(v).getTime()), 'Invalid date')

const hexColour = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid colour')

export const createPhaseSchema = z.object({
  rolloutId: z.string().min(1),
  name: z.string().min(1).max(120).trim(),
  colour: hexColour.optional(),
  startDate: isoDate,
  endDate: isoDate,
  sortOrder: z.coerce.number().int().min(0).default(0),
  goLives: z.array(isoDate).max(20).default([]),
})

export const updatePhaseSchema = z.object({
  id: z.string().min(1),
  rolloutId: z.string().min(1).optional(),
  name: z.string().min(1).max(120).trim().optional(),
  // null clears the override so the phase falls back to its rollout colour.
  colour: hexColour.nullable().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  goLives: z.array(isoDate).max(20).optional(),
})

export const saveAllocationsSchema = z.object({
  allocations: z
    .array(
      z.object({
        phaseId: z.string().min(1),
        roleConfigId: z.string().min(1),
        percentage: z.coerce.number().min(0).max(100),
      })
    )
    .max(2000),
})
