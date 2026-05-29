import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { saveAllocationsSchema } from '@/lib/schemas/estimation'

type Params = { params: Promise<{ id: string }> }

// Bulk upsert allocations. percentage of 0 removes the allocation.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { allocations } = saveAllocationsSchema.parse(body)

    // Restrict to phases and roles that actually belong to this opportunity.
    const [validPhases, validRoles] = await Promise.all([
      prisma.phase.findMany({ where: { rollout: { opportunityId: id } }, select: { id: true } }),
      prisma.roleConfig.findMany({ where: { opportunityId: id }, select: { id: true } }),
    ])
    const phaseSet = new Set(validPhases.map((p) => p.id))
    const roleSet = new Set(validRoles.map((r) => r.id))

    const filtered = allocations.filter((a) => phaseSet.has(a.phaseId) && roleSet.has(a.roleConfigId))

    await prisma.$transaction(
      filtered.map((a) =>
        a.percentage > 0
          ? prisma.allocation.upsert({
              where: { phaseId_roleConfigId: { phaseId: a.phaseId, roleConfigId: a.roleConfigId } },
              update: { percentage: a.percentage },
              create: { phaseId: a.phaseId, roleConfigId: a.roleConfigId, percentage: a.percentage },
            })
          : prisma.allocation.deleteMany({
              where: { phaseId: a.phaseId, roleConfigId: a.roleConfigId },
            })
      )
    )

    return NextResponse.json({ ok: true, saved: filtered.length })
  } catch (error) {
    return handleApiError(error, 'PUT /api/opportunities/[id]/allocations')
  }
}
