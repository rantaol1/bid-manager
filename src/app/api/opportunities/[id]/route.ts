import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { updateOpportunitySchema } from '@/lib/schemas/opportunity'
import { getStage } from '@/lib/constants/stages'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, industry: true, country: true } },
        teamMembers: true,
        activities: { take: 20, orderBy: { createdAt: 'desc' } },
        _count: { select: { deliverables: true } },
      },
    })
    if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    return NextResponse.json(opportunity)
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = updateOpportunitySchema.parse(body)

    const existing = await prisma.opportunity.findUnique({ where: { id }, select: { stage: true } })
    if (!existing) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (parsed.name !== undefined) data.name = parsed.name
    if (parsed.stage !== undefined) data.stage = parsed.stage
    if (parsed.expectedValue !== undefined) data.expectedValue = parsed.expectedValue
    if (parsed.currency !== undefined) data.currency = parsed.currency
    if (parsed.probability !== undefined) data.probability = parsed.probability
    if (parsed.closeDate !== undefined) data.closeDate = parsed.closeDate
    if (parsed.tags !== undefined) data.tags = parsed.tags
    if (parsed.notes !== undefined) data.notes = parsed.notes || null
    if (parsed.timelineConfig !== undefined) data.timelineConfig = parsed.timelineConfig

    const stageChanged = parsed.stage !== undefined && parsed.stage !== existing.stage

    const updated = await prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.update({ where: { id }, data })
      if (stageChanged) {
        const from = getStage(existing.stage)?.label ?? existing.stage
        const to = getStage(parsed.stage!)?.label ?? parsed.stage
        await tx.activity.create({
          data: {
            opportunityId: id,
            type: 'stage_change',
            description: `Stage changed from ${from} to ${to}`,
            metadata: { from: existing.stage, to: parsed.stage },
            createdBy: userId,
          },
        })
      }
      return opp
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/opportunities/[id]')
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin', 'bid_manager'])
    const { id } = await params
    await prisma.opportunity.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/opportunities/[id]')
  }
}
