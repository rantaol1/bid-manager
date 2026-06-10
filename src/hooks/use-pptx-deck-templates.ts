import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { DeckKind, PptxMapping } from '@/lib/schemas/pptx-deck-template'

export interface ParsedSlideDTO {
  index: number
  title: string
  tokens: string[]
  hasTable: boolean
}

export interface PptxDeckTemplateDTO {
  id: string
  name: string
  deckKind: DeckKind
  isActive: boolean
  fileName: string
  fileSize: number
  wasNormalized: boolean
  slides: ParsedSlideDTO[]
  mapping: PptxMapping
  createdAt: string
}

export function usePptxDeckTemplates(opts?: { kind?: DeckKind }) {
  const qs = opts?.kind ? `?kind=${opts.kind}` : ''
  return useQuery({
    queryKey: ['pptx-deck-templates', opts?.kind ?? 'all'],
    queryFn: () => apiFetch<{ data: PptxDeckTemplateDTO[] }>(`/api/pptx-deck-templates${qs}`).then((r) => r.data),
  })
}

export function usePptxDeckTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['pptx-deck-templates', 'one', id],
    enabled: !!id,
    queryFn: () => apiFetch<{ data: PptxDeckTemplateDTO }>(`/api/pptx-deck-templates/${id}`).then((r) => r.data),
  })
}

export function useUploadPptxDeckTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { file: File; name: string; deckKind: DeckKind }) => {
      const fd = new FormData()
      fd.append('file', input.file)
      fd.append('name', input.name)
      fd.append('deckKind', input.deckKind)
      return apiFetch<{ data: PptxDeckTemplateDTO }>('/api/pptx-deck-templates', { method: 'POST', body: fd }).then(
        (r) => r.data
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pptx-deck-templates'] }),
  })
}

export function useUpdatePptxDeckTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name?: string; mapping?: PptxMapping; isActive?: boolean }) => {
      const { id, ...body } = input
      return apiFetch<{ data: PptxDeckTemplateDTO }>(`/api/pptx-deck-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pptx-deck-templates'] }),
  })
}

export function useDeletePptxDeckTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/pptx-deck-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pptx-deck-templates'] }),
  })
}
