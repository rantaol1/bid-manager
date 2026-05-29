import { z } from 'zod'

const fitGap = z.enum(['fit', 'partial', 'gap'])

export const scopeSchema = z.object({
  modules: z.record(
    z.string(),
    z.object({
      selected: z.boolean(),
      fitGap: fitGap.optional(),
      notes: z.string().max(1000).optional(),
    })
  ),
  requirements: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(300).trim(),
        moduleId: z.string().max(40).optional(),
        description: z.string().max(2000).optional(),
        priority: z.enum(['must', 'should', 'could', 'wont']),
        fitGap,
      })
    )
    .max(500),
  assumptions: z.array(z.string().max(1000)).max(100),
  exclusions: z.array(z.string().max(1000)).max(100),
  risks: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(300).trim(),
        description: z.string().max(2000).optional(),
        likelihood: z.enum(['low', 'medium', 'high']),
        impact: z.enum(['low', 'medium', 'high']),
        mitigation: z.string().max(2000).optional(),
      })
    )
    .max(200),
})

export type ScopeInput = z.infer<typeof scopeSchema>
