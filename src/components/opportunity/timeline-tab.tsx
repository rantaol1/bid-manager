'use client'

import { EmptyState } from '@/components/common/empty-state'

export function TimelineTab({ opportunityId }: { opportunityId: string }) {
  void opportunityId
  return <EmptyState message="Timeline" hint="Roadmap builder arrives in build step 10." />
}
