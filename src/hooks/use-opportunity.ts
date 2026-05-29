'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { AddTeamMemberInput } from '@/lib/schemas/opportunity'

export interface TeamMemberDTO {
  id: string
  opportunityId: string
  userId: string
  userName: string
  userEmail: string | null
  role: string
}

export interface ActivityDTO {
  id: string
  type: string
  description: string
  createdAt: string
  metadata?: unknown
}

export interface OpportunityDetailDTO {
  id: string
  name: string
  stage: string
  expectedValue: string | null
  currency: string
  probability: number | null
  closeDate: string | null
  tags: string[]
  notes: string | null
  customer: { id: string; name: string; industry: string | null; country: string | null }
  teamMembers: TeamMemberDTO[]
  activities: ActivityDTO[]
  _count: { deliverables: number }
}

export function useOpportunity(id: string, initialData?: OpportunityDetailDTO) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => apiFetch<OpportunityDetailDTO>(`/api/opportunities/${id}`),
    initialData,
  })
}

export function useTeam(id: string, initialData?: TeamMemberDTO[]) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () =>
      apiFetch<{ data: TeamMemberDTO[] }>(`/api/opportunities/${id}/team`).then((r) => r.data),
    initialData,
  })
}

export function useAddTeamMember(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddTeamMemberInput) =>
      apiFetch<TeamMemberDTO>(`/api/opportunities/${id}/team`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', id] })
      qc.invalidateQueries({ queryKey: ['opportunity', id] })
    },
  })
}

export function useRemoveTeamMember(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch<void>(`/api/opportunities/${id}/team?memberId=${memberId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', id] })
      qc.invalidateQueries({ queryKey: ['opportunity', id] })
    },
  })
}
