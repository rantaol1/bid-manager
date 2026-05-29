import { PageShell } from '@/components/layout/page-shell'
import { PipelineView } from '@/components/pipeline/pipeline-view'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { OpportunityDTO } from '@/hooks/use-opportunities'

export default async function PipelinePage() {
  await requireAuth()

  const limit = 100
  const [rows, total] = await Promise.all([
    prisma.opportunity.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { deliverables: true, teamMembers: true } },
      },
    }),
    prisma.opportunity.count(),
  ])

  const data: OpportunityDTO[] = rows.map((o) => ({
    id: o.id,
    name: o.name,
    customerId: o.customerId,
    customer: o.customer,
    stage: o.stage,
    expectedValue: o.expectedValue ? o.expectedValue.toString() : null,
    currency: o.currency,
    probability: o.probability,
    closeDate: o.closeDate ? o.closeDate.toISOString() : null,
    tags: o.tags,
    notes: o.notes,
    updatedAt: o.updatedAt.toISOString(),
    createdBy: o.createdBy,
    _count: o._count,
  }))

  return (
    <PageShell title="Pipeline" description="Drag opportunities between stages, or switch to table view.">
      <PipelineView
        initialData={{ data, pagination: { page: 1, limit, total, pages: Math.ceil(total / limit) } }}
      />
    </PageShell>
  )
}
