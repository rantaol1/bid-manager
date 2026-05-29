'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { StageId } from '@/lib/constants/stages'
import type { CreateOpportunityInput, UpdateOpportunityInput } from '@/lib/schemas/opportunity'

export interface OpportunityDTO {
  id: string
  name: string
  customerId: string
  customer: { id: string; name: string }
  stage: string
  expectedValue: string | null
  currency: string
  probability: number | null
  closeDate: string | null
  tags: string[]
  notes: string | null
  updatedAt: string
  createdBy: string
  _count?: { deliverables: number; teamMembers: number }
}

interface ListResponse {
  data: OpportunityDTO[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export function useOpportunities(initialData?: ListResponse) {
  return useQuery({
    queryKey: ['opportunities'],
    queryFn: () => apiFetch<ListResponse>('/api/opportunities?limit=100'),
    initialData,
  })
}

export function useCreateOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOpportunityInput) =>
      apiFetch<OpportunityDTO>('/api/opportunities', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  })
}

export function useUpdateOpportunity(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateOpportunityInput) =>
      apiFetch<OpportunityDTO>(`/api/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunity', id] })
    },
  })
}

export function useChangeStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: StageId }) =>
      apiFetch<OpportunityDTO>(`/api/opportunities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunity', vars.id] })
    },
  })
}

export function useDeleteOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/opportunities/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
  })
}
