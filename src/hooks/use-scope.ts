'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { ScopeModules, ScopeRequirement, ScopeRisk, ScopePhase } from '@/types'

export interface ScopeData {
  modules: ScopeModules
  phases: ScopePhase[]
  requirements: ScopeRequirement[]
  assumptions: string[]
  exclusions: string[]
  deferred: string[]
  risks: ScopeRisk[]
}

export function useScope(id: string) {
  return useQuery({
    queryKey: ['scope', id],
    queryFn: () => apiFetch<{ data: ScopeData }>(`/api/opportunities/${id}/scope`).then((r) => r.data),
  })
}

export function useSaveScope(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scope: ScopeData) =>
      apiFetch(`/api/opportunities/${id}/scope`, { method: 'PUT', body: JSON.stringify(scope) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scope', id] }),
  })
}
