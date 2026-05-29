'use client'

import { EmptyState } from '@/components/common/empty-state'

export function DeliverablesTab({ opportunityId }: { opportunityId: string }) {
  void opportunityId
  return <EmptyState message="Deliverables" hint="File upload and document generation arrive in build steps 11–12." />
}
