import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WorkspaceTabs } from '@/components/opportunity/workspace-tabs'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStage } from '@/lib/constants/stages'
import type { OpportunityDetailDTO } from '@/hooks/use-opportunity'

export default async function OpportunityWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params

  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, industry: true, country: true } },
      teamMembers: true,
      activities: { take: 20, orderBy: { createdAt: 'desc' } },
      _count: { select: { deliverables: true } },
    },
  })

  if (!opp) notFound()

  const dto: OpportunityDetailDTO = {
    id: opp.id,
    name: opp.name,
    stage: opp.stage,
    expectedValue: opp.expectedValue ? opp.expectedValue.toString() : null,
    currency: opp.currency,
    probability: opp.probability,
    closeDate: opp.closeDate ? opp.closeDate.toISOString() : null,
    tags: opp.tags,
    notes: opp.notes,
    customer: opp.customer,
    teamMembers: opp.teamMembers,
    activities: opp.activities.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
      metadata: a.metadata,
    })),
    _count: opp._count,
  }

  const stage = getStage(opp.stage)

  return (
    <PageShell
      title={opp.name}
      description={opp.customer.name}
      actions={
        <div className="flex items-center gap-3">
          {stage && (
            <Badge style={{ backgroundColor: stage.colour }} className="text-white">
              {stage.label}
            </Badge>
          )}
          <Button variant="outline" render={<Link href="/pipeline" />}>
            <ArrowLeft className="h-4 w-4" />
            Pipeline
          </Button>
        </div>
      }
    >
      <WorkspaceTabs initialOpportunity={dto} />
    </PageShell>
  )
}
