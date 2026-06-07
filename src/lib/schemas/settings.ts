import { z } from 'zod'

export const rateCardSchema = z.object({
  roles: z
    .array(
      z.object({
        id: z.string().optional(),
        roleName: z.string().min(1).max(120).trim(),
        rate: z.number().min(0).max(100_000),
        rateUnit: z.enum(['day', 'hour']).default('day'),
        hoursPerDay: z.number().int().min(1).max(24).default(8),
        sortOrder: z.number().int().default(0),
      })
    )
    .max(50),
})

export const brandingSchema = z.object({
  companyName: z.string().min(1).max(120).trim().optional(),
  logoUrl: z.string().url().max(1000).nullable().optional(),
  defaultCurrency: z.string().length(3).optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
  footerText: z.string().max(200).optional(),
  templateSelections: z
    .object({
      estimate: z.string().nullable().optional(),
      pricing: z.string().nullable().optional(),
      proposal: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type RateCardInput = z.infer<typeof rateCardSchema>
export type BrandingInput = z.infer<typeof brandingSchema>
