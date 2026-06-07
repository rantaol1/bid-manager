import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { BrandingInput } from '@/lib/schemas/settings'

export interface BrandingSettingsDTO {
  id: string
  companyName: string
  logoUrl: string | null
  defaultCurrency: string
  validityDays: number
  footerText: string
  templateSelections: { estimate?: string | null; pricing?: string | null; proposal?: string | null } | null
  updatedAt: string
}

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: () => apiFetch<{ data: BrandingSettingsDTO }>('/api/settings/branding').then((r) => r.data),
  })
}

export function useSaveBranding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BrandingInput) =>
      apiFetch<{ data: BrandingSettingsDTO }>('/api/settings/branding', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(['branding'], data),
  })
}
