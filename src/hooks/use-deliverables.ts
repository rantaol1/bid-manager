'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'

export interface DeliverableVersionDTO {
  id: string
  version: number
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  changeSummary: string | null
  createdAt: string
  createdBy: string
}

export interface DeliverableDTO {
  id: string
  name: string
  type: string
  description: string | null
  currentVersion: number
  createdAt: string
  updatedAt: string
  versions: DeliverableVersionDTO[]
}

export function useDeliverables(id: string) {
  return useQuery({
    queryKey: ['deliverables', id],
    queryFn: () =>
      apiFetch<{ data: DeliverableDTO[] }>(`/api/opportunities/${id}/deliverables`).then((r) => r.data),
  })
}

export function useUploadDeliverable(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { file: File; name: string; description?: string }) => {
      const fd = new FormData()
      fd.append('file', input.file)
      fd.append('name', input.name)
      fd.append('type', 'upload')
      if (input.description) fd.append('description', input.description)
      return apiFetch<DeliverableDTO>(`/api/opportunities/${id}/deliverables`, { method: 'POST', body: fd })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliverables', id] })
      qc.invalidateQueries({ queryKey: ['opportunity', id] })
    },
  })
}

export function useUploadVersion(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { deliverableId: string; file: File; changeSummary?: string }) => {
      const fd = new FormData()
      fd.append('file', input.file)
      if (input.changeSummary) fd.append('changeSummary', input.changeSummary)
      return apiFetch<DeliverableDTO>(
        `/api/opportunities/${id}/deliverables/${input.deliverableId}/versions`,
        { method: 'POST', body: fd }
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverables', id] }),
  })
}

export function useDeleteDeliverable(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deliverableId: string) =>
      apiFetch<void>(`/api/opportunities/${id}/deliverables?deliverableId=${deliverableId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliverables', id] })
      qc.invalidateQueries({ queryKey: ['opportunity', id] })
    },
  })
}
