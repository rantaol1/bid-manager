import { z } from 'zod'
import { STAGE_IDS } from '@/lib/constants/stages'

const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((v) => v === null || !isNaN(v.getTime()), 'Invalid date')

export const createOpportunitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  customerId: z.string().min(1, 'Customer is required'),
  stage: z.enum(STAGE_IDS).default('lead'),
  expectedValue: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
  currency: z.string().length(3).default('EUR'),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  closeDate: optionalDate,
  tags: z.array(z.string().max(40)).max(20).default([]),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

const timelineGroupSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().max(120),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid colour'),
  phaseIds: z.array(z.string().max(64)).max(500),
  offsetY: z.number().min(-5000).max(5000).optional(),
})

export const timelineConfigSchema = z
  .object({
    pxPerMonth: z.number().min(10).max(500).optional(),
    lanes: z.record(z.string(), z.number()).optional(),
    groups: z.array(timelineGroupSchema).max(50).optional(),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid colour').optional(),
    goLiveOffsets: z.record(z.string(), z.number().min(-2000).max(2000)).optional(),
  })
  .strict()

export const updateOpportunitySchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  stage: z.enum(STAGE_IDS).optional(),
  expectedValue: z.coerce.number().min(0).max(1_000_000_000).optional().nullable(),
  currency: z.string().length(3).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  closeDate: optionalDate,
  tags: z.array(z.string().max(40)).max(20).optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  timelineConfig: timelineConfigSchema.optional(),
})

export const stageChangeSchema = z.object({
  stage: z.enum(STAGE_IDS),
})

export const addTeamMemberSchema = z.object({
  userName: z.string().min(1, 'Name is required').max(200).trim(),
  userEmail: z.string().email().max(200).optional().or(z.literal('')),
  role: z.string().min(1, 'Role is required').max(100).trim(),
})

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>

export type CreateOpportunityInput = z.input<typeof createOpportunitySchema>
export type UpdateOpportunityInput = z.input<typeof updateOpportunitySchema>
