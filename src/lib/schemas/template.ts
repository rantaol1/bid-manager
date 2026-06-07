import { z } from 'zod'

export const templateKinds = ['docx_template', 'text_source'] as const

/** Multipart upload fields (validated after parsing FormData). */
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(160).trim(),
  kind: z.enum(templateKinds),
  category: z.string().max(60).optional(),
})

export type TemplateKind = (typeof templateKinds)[number]
