'use client'

import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'

export type SuggestScope =
  | { type: 'project' }
  | { type: 'rollout'; rolloutId: string }
  | { type: 'phase'; phaseId: string }

export interface SuggestBody {
  targetCost: number
  scope: SuggestScope
  guidance?: string
}

export interface SuggestData {
  allocations: { phaseId: string; roleConfigId: string; percentage: number }[]
  rationale: string
  assumptions: string[]
  achievedCost: number
  targetCost: number
  variancePct: number
}

export function useSuggestAllocations(id: string) {
  return useMutation({
    mutationFn: (body: SuggestBody) =>
      apiFetch<{ data: SuggestData }>(`/api/opportunities/${id}/estimation/suggest`, {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data),
  })
}
