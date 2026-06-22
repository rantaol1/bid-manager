import { z } from 'zod'

export const suggestRequestSchema = z.object({
  targetCost: z.coerce.number().positive().max(1_000_000_000),
  scope: z.discriminatedUnion('type', [
    z.object({ type: z.literal('project') }),
    z.object({ type: z.literal('rollout'), rolloutId: z.string().min(1) }),
    z.object({ type: z.literal('phase'), phaseId: z.string().min(1) }),
  ]),
  guidance: z.string().max(2000).optional(),
})

export type SuggestRequest = z.infer<typeof suggestRequestSchema>
export type ScopeFilter = SuggestRequest['scope']
