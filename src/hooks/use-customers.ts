'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { CreateCustomerInput, UpdateCustomerInput } from '@/lib/schemas/customer'
import type { Pagination } from '@/types'

export interface CustomerDTO {
  id: string
  name: string
  industry: string | null
  country: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  _count?: { opportunities: number }
}

interface CustomerListResponse {
  data: CustomerDTO[]
  pagination: Pagination
}

export function useCustomers(search: string, initialData?: CustomerListResponse) {
  return useQuery({
    queryKey: ['customers', { search }],
    queryFn: () =>
      apiFetch<CustomerListResponse>(
        `/api/customers?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`
      ),
    initialData: search ? undefined : initialData,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      apiFetch<CustomerDTO>('/api/customers', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCustomerInput) =>
      apiFetch<CustomerDTO>(`/api/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer', id] })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
