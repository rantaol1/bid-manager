'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { EstimationSummary } from '@/types'

export interface RevisionListItem {
  id: string
  label: string
  kind: string
  note: string | null
  summary: EstimationSummary | null
  createdAt: string
  createdBy: string
}

export function useRevisions(id: string) {
  return useQuery({
    queryKey: ['revisions', id],
    queryFn: () =>
      apiFetch<{ data: RevisionListItem[] }>(`/api/opportunities/${id}/revisions`).then((r) => r.data),
  })
}

interface CreateRevisionInput {
  label: string
  kind?: 'manual' | 'ai'
  note?: string
  fromRevisionId?: string
}

export function useRevisionMutations(id: string) {
  const qc = useQueryClient()
  const invalidateList = () => qc.invalidateQueries({ queryKey: ['revisions', id] })

  const createRevision = useMutation({
    mutationFn: (input: CreateRevisionInput) =>
      apiFetch(`/api/opportunities/${id}/revisions`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidateList,
  })

  const renameRevision = useMutation({
    mutationFn: (input: { revId: string; label?: string; note?: string | null }) =>
      apiFetch(`/api/opportunities/${id}/revisions/${input.revId}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: input.label, note: input.note }),
      }),
    onSuccess: invalidateList,
  })

  const deleteRevision = useMutation({
    mutationFn: (revId: string) =>
      apiFetch(`/api/opportunities/${id}/revisions/${revId}`, { method: 'DELETE' }),
    onSuccess: invalidateList,
  })

  // Restoring overwrites the live working copy, so the estimation queries must refetch
  // (the Estimation tab rebuilds its allocation draft from the restored rollouts).
  const restoreRevision = useMutation({
    mutationFn: (revId: string) =>
      apiFetch(`/api/opportunities/${id}/revisions/${revId}/restore`, { method: 'POST' }),
    onSuccess: () => {
      invalidateList()
      qc.invalidateQueries({ queryKey: ['roles', id] })
      qc.invalidateQueries({ queryKey: ['rollouts', id] })
    },
  })

  return { createRevision, renameRevision, deleteRevision, restoreRevision }
}
