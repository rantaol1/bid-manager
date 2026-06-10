'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { TimelineConfig } from '@/types'

export interface RoleConfigDTO {
  id: string
  opportunityId: string
  roleName: string
  rate: string
  rateUnit: string
  hoursPerDay: number
  sortOrder: number
}

export interface AllocationDTO {
  id: string
  phaseId: string
  roleConfigId: string
  percentage: string
}

export interface PhaseDTO {
  id: string
  rolloutId: string
  name: string
  colour: string | null
  startDate: string
  endDate: string
  workingDays: number
  sortOrder: number
  goLives: string[]
  allocations: AllocationDTO[]
}

export interface RolloutDTO {
  id: string
  opportunityId: string
  name: string
  colour: string
  sortOrder: number
  phases: PhaseDTO[]
}

export function useRoles(id: string) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => apiFetch<{ data: RoleConfigDTO[] }>(`/api/opportunities/${id}/roles`).then((r) => r.data),
  })
}

export function useRollouts(id: string) {
  return useQuery({
    queryKey: ['rollouts', id],
    queryFn: () => apiFetch<{ data: RolloutDTO[] }>(`/api/opportunities/${id}/rollouts`).then((r) => r.data),
  })
}

export function useTimelineConfig(id: string) {
  return useQuery({
    queryKey: ['timeline-config', id],
    queryFn: () =>
      apiFetch<{ timelineConfig: TimelineConfig | null }>(`/api/opportunities/${id}`).then(
        (o) => o.timelineConfig ?? {}
      ),
  })
}

interface RoleInput {
  id?: string
  roleName: string
  rate: number
  rateUnit?: string
  hoursPerDay?: number
  sortOrder?: number
}

export function useEstimationMutations(id: string) {
  const qc = useQueryClient()
  const invalidateRoles = () => qc.invalidateQueries({ queryKey: ['roles', id] })
  const invalidateRollouts = () => qc.invalidateQueries({ queryKey: ['rollouts', id] })

  const saveRoles = useMutation({
    mutationFn: (roles: RoleInput[]) =>
      apiFetch(`/api/opportunities/${id}/roles`, { method: 'PUT', body: JSON.stringify({ roles }) }),
    onSuccess: () => {
      invalidateRoles()
      invalidateRollouts()
    },
  })

  const createRollout = useMutation({
    mutationFn: (input: { name: string; colour: string; sortOrder: number }) =>
      apiFetch(`/api/opportunities/${id}/rollouts`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidateRollouts,
  })

  const updateRollout = useMutation({
    mutationFn: (input: { id: string; name?: string; colour?: string; sortOrder?: number }) =>
      apiFetch(`/api/opportunities/${id}/rollouts`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: invalidateRollouts,
  })

  const deleteRollout = useMutation({
    mutationFn: (rolloutId: string) =>
      apiFetch(`/api/opportunities/${id}/rollouts?rolloutId=${rolloutId}`, { method: 'DELETE' }),
    onSuccess: invalidateRollouts,
  })

  const createPhase = useMutation({
    mutationFn: (input: {
      rolloutId: string
      name: string
      startDate: string
      endDate: string
      sortOrder: number
      goLives?: string[]
    }) => apiFetch(`/api/opportunities/${id}/phases`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidateRollouts,
  })

  const updatePhase = useMutation({
    mutationFn: (input: {
      id: string
      rolloutId?: string
      name?: string
      colour?: string | null
      startDate?: string
      endDate?: string
      sortOrder?: number
      goLives?: string[]
    }) => apiFetch(`/api/opportunities/${id}/phases`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: invalidateRollouts,
  })

  const deletePhase = useMutation({
    mutationFn: (phaseId: string) =>
      apiFetch(`/api/opportunities/${id}/phases?phaseId=${phaseId}`, { method: 'DELETE' }),
    onSuccess: invalidateRollouts,
  })

  const saveAllocations = useMutation({
    mutationFn: (allocations: { phaseId: string; roleConfigId: string; percentage: number }[]) =>
      apiFetch(`/api/opportunities/${id}/allocations`, {
        method: 'PUT',
        body: JSON.stringify({ allocations }),
      }),
    onSuccess: invalidateRollouts,
  })

  const saveTimelineConfig = useMutation({
    mutationFn: (timelineConfig: TimelineConfig) =>
      apiFetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ timelineConfig }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline-config', id] })
      // The plan-slide preview reads the card background from proposal data.
      qc.invalidateQueries({ queryKey: ['proposalData', id] })
    },
  })

  return {
    saveRoles,
    createRollout,
    updateRollout,
    deleteRollout,
    createPhase,
    updatePhase,
    deletePhase,
    saveAllocations,
    saveTimelineConfig,
  }
}
