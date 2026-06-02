import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { ProposalContentInput, ProposalDefaultsInput } from '@/lib/schemas/proposal'
import type { ProposalStructuredContent } from '@/types'
import type { DeliverableType } from '@/lib/documents/proposal-sections'

/** Per-opportunity content row (all fields optional / nullable). */
export type ProposalContentDTO = Partial<ProposalContentInput> & { id?: string }

export function useProposalContent(id: string) {
  return useQuery({
    queryKey: ['proposalContent', id],
    queryFn: () =>
      apiFetch<{ data: ProposalContentDTO }>(`/api/opportunities/${id}/proposal-content`).then((r) => r.data),
  })
}

export function useSaveProposalContent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProposalContentInput) =>
      apiFetch<{ data: ProposalContentDTO }>(`/api/opportunities/${id}/proposal-content`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['proposalContent', id], data)
    },
  })
}

export function useProposalDefaults() {
  return useQuery({
    queryKey: ['proposalDefaults'],
    queryFn: () =>
      apiFetch<{ data: ProposalStructuredContent }>(`/api/proposal-defaults`).then((r) => r.data),
  })
}

export function useSaveProposalDefaults() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProposalDefaultsInput) =>
      apiFetch<{ data: ProposalStructuredContent }>(`/api/proposal-defaults`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['proposalDefaults'], data)
    },
  })
}

export function useGenerateProposal(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { type: DeliverableType; selectedSections: string[] }) =>
      apiFetch(`/api/opportunities/${id}/generate/proposal`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliverables', id] })
      qc.invalidateQueries({ queryKey: ['opportunity', id] })
    },
  })
}
