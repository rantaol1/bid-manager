'use client'

import { EmptyState } from '@/components/common/empty-state'

export function EstimationTab({ opportunityId }: { opportunityId: string }) {
  void opportunityId
  return <EmptyState message="Estimation" hint="Role config, phases and allocation matrix arrive in build step 8." />
}
