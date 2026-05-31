import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { calculateWorkingDays } from '@/lib/utils'
import { createPhaseSchema, updatePhaseSchema } from '@/lib/schemas/estimation'

type Params = { params: Promise<{ id: string }> }

// Ensure a rollout belongs to this opportunity.
async function assertRolloutOwned(rolloutId: string, opportunityId: string) {
  const rollout = await prisma.rollout.findFirst({ where: { id: rolloutId, opportunityId }, select: { id: true } })
  return Boolean(rollout)
}

// Ensure a phase belongs to a rollout of this opportunity; returns the phase if so.
async function getOwnedPhase(phaseId: string, opportunityId: string) {
  return prisma.phase.findFirst({
    where: { id: phaseId, rollout: { opportunityId } },
  })
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = createPhaseSchema.parse(body)

    if (!(await assertRolloutOwned(parsed.rolloutId, id))) {
      return NextResponse.json({ error: 'Rollout not found' }, { status: 404 })
    }

    const start = new Date(parsed.startDate)
    const end = new Date(parsed.endDate)
    if (end < start) return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })

    const phase = await prisma.phase.create({
      data: {
        rolloutId: parsed.rolloutId,
        name: parsed.name,
        colour: parsed.colour ?? null,
        startDate: start,
        endDate: end,
        workingDays: calculateWorkingDays(start, end),
        sortOrder: parsed.sortOrder,
        goLives: parsed.goLives.map((d) => new Date(d)),
      },
      include: { allocations: true },
    })
    return NextResponse.json(phase, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/phases')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = updatePhaseSchema.parse(body)

    const existing = await getOwnedPhase(parsed.id, id)
    if (!existing) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

    // Reassigning the phase to a different lane/rollout — the target rollout must
    // belong to the same opportunity.
    if (parsed.rolloutId !== undefined && parsed.rolloutId !== existing.rolloutId) {
      if (!(await assertRolloutOwned(parsed.rolloutId, id))) {
        return NextResponse.json({ error: 'Rollout not found' }, { status: 404 })
      }
    }

    const start = parsed.startDate ? new Date(parsed.startDate) : existing.startDate
    const end = parsed.endDate ? new Date(parsed.endDate) : existing.endDate
    if (end < start) return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })

    const datesChanged = parsed.startDate !== undefined || parsed.endDate !== undefined

    const phase = await prisma.phase.update({
      where: { id: parsed.id },
      data: {
        ...(parsed.rolloutId !== undefined ? { rolloutId: parsed.rolloutId } : {}),
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.colour !== undefined ? { colour: parsed.colour } : {}),
        ...(parsed.startDate !== undefined ? { startDate: start } : {}),
        ...(parsed.endDate !== undefined ? { endDate: end } : {}),
        ...(datesChanged ? { workingDays: calculateWorkingDays(start, end) } : {}),
        ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
        ...(parsed.goLives !== undefined ? { goLives: parsed.goLives.map((d) => new Date(d)) } : {}),
      },
      include: { allocations: true },
    })
    return NextResponse.json(phase)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/opportunities/[id]/phases')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const phaseId = new URL(req.url).searchParams.get('phaseId')
    if (!phaseId) return NextResponse.json({ error: 'phaseId is required' }, { status: 400 })
    const owned = await getOwnedPhase(phaseId, id)
    if (!owned) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })
    await prisma.phase.delete({ where: { id: phaseId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/opportunities/[id]/phases')
  }
}
