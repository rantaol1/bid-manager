import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { DeliverableType } from '@/lib/documents/proposal-sections'
import type { DeckVersionContentInput } from '@/lib/schemas/deck-template'

export interface DeckVersionMeta {
  id: string
  version: number
  label: string | null
  createdAt: string
}

export interface DeckTemplateDTO {
  id: string
  name: string
  description: string | null
  kind: DeliverableType
  isWorkspaceDefault: boolean
  defaultVersionId: string | null
  versions: DeckVersionMeta[]
  createdAt: string
}

/** Full version snapshot (the editable content layer). */
export type DeckVersionDTO = DeckVersionContentInput & {
  id: string
  templateId: string
  version: number
  label: string | null
  createdAt: string
}

export function useDeckTemplates(opts?: { kind?: DeliverableType }) {
  const qs = opts?.kind ? `?kind=${opts.kind}` : ''
  return useQuery({
    queryKey: ['deck-templates', opts?.kind ?? 'all'],
    queryFn: () => apiFetch<{ data: DeckTemplateDTO[] }>(`/api/deck-templates${qs}`).then((r) => r.data),
  })
}

export function useDeckTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['deck-templates', 'one', id],
    enabled: !!id,
    queryFn: () => apiFetch<{ data: DeckTemplateDTO }>(`/api/deck-templates/${id}`).then((r) => r.data),
  })
}

export function useDeckTemplateVersion(templateId: string | undefined, versionId: string | undefined) {
  return useQuery({
    queryKey: ['deck-templates', 'version', templateId, versionId],
    enabled: !!templateId && !!versionId,
    queryFn: () =>
      apiFetch<{ data: DeckVersionDTO }>(`/api/deck-templates/${templateId}/versions/${versionId}`).then(
        (r) => r.data
      ),
  })
}

export function useCreateDeckTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; kind: DeliverableType }) =>
      apiFetch<{ data: DeckTemplateDTO }>('/api/deck-templates', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deck-templates'] }),
  })
}

export function useUpdateDeckTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      name?: string
      description?: string | null
      isWorkspaceDefault?: boolean
      defaultVersionId?: string
    }) => {
      const { id, ...body } = input
      return apiFetch<{ data: DeckTemplateDTO }>(`/api/deck-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deck-templates'] }),
  })
}

export function useDeleteDeckTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/deck-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deck-templates'] }),
  })
}

export function useSaveDeckVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      templateId: string
      content: DeckVersionContentInput
      label?: string | null
      setAsDefault?: boolean
    }) => {
      const { templateId, ...body } = input
      return apiFetch<{ data: DeckVersionDTO }>(`/api/deck-templates/${templateId}/versions`, {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deck-templates'] }),
  })
}
