import { z } from 'zod'

export const deckKinds = ['full_proposal', 'board_summary'] as const
export type DeckKind = (typeof deckKinds)[number]

/** Section -> slide mapping + generic-slide positions + which sections use the
 *  spliced app-drawn visual slides. Slide indices are 1-based (presentation order). */
export const pptxMappingSchema = z.object({
  sectionMap: z.record(z.string().min(1), z.number().int().min(1)),
  genericSlides: z
    .array(z.object({ slideIndex: z.number().int().min(1), position: z.number().int().min(0) }))
    .max(50),
  visualSplice: z.array(z.string().min(1)).max(40),
})

export const createPptxDeckTemplateSchema = z.object({
  name: z.string().min(1).max(160).trim(),
  deckKind: z.enum(deckKinds),
})

export const updatePptxDeckTemplateSchema = z.object({
  name: z.string().min(1).max(160).trim().optional(),
  mapping: pptxMappingSchema.optional(),
  isActive: z.boolean().optional(),
})

export type PptxMapping = z.infer<typeof pptxMappingSchema>
export type CreatePptxDeckTemplateInput = z.infer<typeof createPptxDeckTemplateSchema>
export type UpdatePptxDeckTemplateInput = z.infer<typeof updatePptxDeckTemplateSchema>

/** Default visual-splice sections per kind (the two code-drawn visuals live in the
 *  full proposal; the board summary has no heavy visual). */
export function defaultVisualSplice(kind: DeckKind): string[] {
  return kind === 'full_proposal' ? ['solution_overview', 'plan'] : []
}
