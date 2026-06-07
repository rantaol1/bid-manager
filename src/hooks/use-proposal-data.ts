import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/fetcher'
import type { ProposalData } from '@/lib/documents/proposal-data'

/** Resolved proposal data for previews (meta, summary, scope, content, narrative, branding). */
export function useProposalData(id: string) {
  return useQuery({
    queryKey: ['proposalData', id],
    queryFn: () => apiFetch<{ data: ProposalData }>(`/api/opportunities/${id}/proposal-data`).then((r) => r.data),
  })
}
