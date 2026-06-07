import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { RateCardInput } from '@/lib/schemas/settings'

export interface RateCardRole {
  id?: string
  roleName: string
  rate: number
  rateUnit: 'day' | 'hour'
  hoursPerDay: number
  sortOrder: number
}

export function useRateCard() {
  return useQuery({
    queryKey: ['rateCard'],
    queryFn: () => apiFetch<{ data: RateCardRole[] }>('/api/settings/rate-card').then((r) => r.data),
  })
}

export function useSaveRateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RateCardInput) =>
      apiFetch<{ data: RateCardRole[] }>('/api/settings/rate-card', {
        method: 'PUT',
        body: JSON.stringify(input),
      }).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(['rateCard'], data),
  })
}
