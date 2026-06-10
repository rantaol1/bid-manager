import { z } from 'zod'
import { proposalContentSchema, proposalDefaultsSchema } from '@/lib/schemas/proposal'

/** The narrative subset of a deck (same field shapes as per-opportunity content). */
const narrativeSchema = proposalContentSchema.pick({
  executiveSummary: true,
  understanding: true,
  valueDrivers: true,
  commercialModel: true,
  recommendation: true,
  teamProfiles: true,
  references: true,
  contactName: true,
  contactTitle: true,
  contactEmail: true,
  contactPhone: true,
})

/** Full editable content of one deck version: structured blocks (complete) +
 *  narrative defaults + section on/off selection + branding overrides. */
export const deckVersionContentSchema = z.object({
  ...proposalDefaultsSchema.shape,
  ...narrativeSchema.shape,
  sectionSelection: z.record(z.string().min(1), z.boolean()),
  companyName: z.string().max(120).nullable().optional(),
  footerText: z.string().max(300).nullable().optional(),
})

export const createDeckVersionSchema = z.object({
  content: deckVersionContentSchema,
  label: z.string().max(160).nullable().optional(),
  setAsDefault: z.boolean().optional(),
})

export const createDeckTemplateSchema = z.object({
  name: z.string().min(1).max(160).trim(),
  description: z.string().max(600).nullable().optional(),
  kind: z.enum(['full_proposal', 'board_summary']),
})

export const updateDeckTemplateSchema = z.object({
  name: z.string().min(1).max(160).trim().optional(),
  description: z.string().max(600).nullable().optional(),
  isWorkspaceDefault: z.boolean().optional(),
  defaultVersionId: z.string().min(1).optional(),
})

export type DeckVersionContentInput = z.infer<typeof deckVersionContentSchema>
export type CreateDeckVersionInput = z.infer<typeof createDeckVersionSchema>
export type CreateDeckTemplateInput = z.infer<typeof createDeckTemplateSchema>
export type UpdateDeckTemplateInput = z.infer<typeof updateDeckTemplateSchema>
