'use client'

import { EmptyState } from '@/components/common/empty-state'

export function ScopeTab({ opportunityId }: { opportunityId: string }) {
  void opportunityId
  return <EmptyState message="Scope" hint="Module picker and requirements arrive in build step 9." />
}
