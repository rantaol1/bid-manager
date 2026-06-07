'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewTab } from '@/components/opportunity/overview-tab'
import { ScopeTab } from '@/components/opportunity/scope-tab'
import { EstimationTab } from '@/components/opportunity/estimation-tab'
import { TimelineTab } from '@/components/opportunity/timeline-tab'
import { ProposalContentTab } from '@/components/opportunity/proposal-content-tab'
import { DeliverablesTab } from '@/components/opportunity/deliverables-tab'
import { useOpportunity, type OpportunityDetailDTO } from '@/hooks/use-opportunity'

const TAB_DEFS = [
  { value: 'overview', label: 'Overview' },
  { value: 'scope', label: 'Scope' },
  { value: 'estimation', label: 'Estimation' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'deliverables', label: 'Deliverables' },
]

export function WorkspaceTabs({ initialOpportunity }: { initialOpportunity: OpportunityDetailDTO }) {
  const { data } = useOpportunity(initialOpportunity.id, initialOpportunity)
  const opportunity = data ?? initialOpportunity

  return (
    <Tabs defaultValue="overview" className="flex flex-col gap-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        {TAB_DEFS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab opportunity={opportunity} />
      </TabsContent>
      <TabsContent value="scope">
        <ScopeTab opportunityId={opportunity.id} />
      </TabsContent>
      <TabsContent value="estimation">
        <EstimationTab opportunityId={opportunity.id} currency={opportunity.currency} />
      </TabsContent>
      <TabsContent value="timeline">
        <TimelineTab opportunityId={opportunity.id} />
      </TabsContent>
      <TabsContent value="proposal">
        <ProposalContentTab opportunityId={opportunity.id} />
      </TabsContent>
      <TabsContent value="deliverables">
        <DeliverablesTab opportunityId={opportunity.id} />
      </TabsContent>
    </Tabs>
  )
}
