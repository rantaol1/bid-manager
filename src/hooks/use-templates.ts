import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'

export interface TemplateSnippet {
  heading: string
  text: string
}

export interface TemplateDTO {
  id: string
  name: string
  kind: string // 'docx_template' | 'text_source'
  docType: string // 'docx' | 'pptx'
  category: string | null
  fileName: string
  mimeType: string
  fileSize: number
  extractedText: string | null
  snippets: TemplateSnippet[] | null
  createdAt: string
}

export function useTemplates(opts?: { kind?: string }) {
  const qs = opts?.kind ? `?kind=${opts.kind}` : ''
  return useQuery({
    queryKey: ['templates', opts?.kind ?? 'all'],
    queryFn: () => apiFetch<{ data: TemplateDTO[] }>(`/api/templates${qs}`).then((r) => r.data),
  })
}

export function useUploadTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { file: File; name: string; kind: string; category?: string }) => {
      const fd = new FormData()
      fd.append('file', input.file)
      fd.append('name', input.name)
      fd.append('kind', input.kind)
      if (input.category) fd.append('category', input.category)
      return apiFetch<{ data: TemplateDTO }>('/api/templates', { method: 'POST', body: fd }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/templates?id=${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}
