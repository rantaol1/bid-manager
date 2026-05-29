import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { createRolloutSchema, updateRolloutSchema } from '@/lib/schemas/estimation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const rollouts = await prisma.rollout.findMany({
      where: { opportunityId: id },
      orderBy: { sortOrder: 'asc' },
      include: {
        phases: {
          orderBy: { sortOrder: 'asc' },
          include: { allocations: true },
        },
      },
    })
    return NextResponse.json({ data: rollouts })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/rollouts')
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = createRolloutSchema.parse(body)
    const rollout = await prisma.rollout.create({
      data: { opportunityId: id, name: parsed.name, colour: parsed.colour, sortOrder: parsed.sortOrder },
      include: { phases: { include: { allocations: true } } },
    })
    return NextResponse.json(rollout, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/rollouts')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = updateRolloutSchema.parse(body)
    const { count } = await prisma.rollout.updateMany({
      where: { id: parsed.id, opportunityId: id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.colour !== undefined ? { colour: parsed.colour } : {}),
        ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      },
    })
    if (count === 0) return NextResponse.json({ error: 'Rollout not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/opportunities/[id]/rollouts')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const rolloutId = new URL(req.url).searchParams.get('rolloutId')
    if (!rolloutId) return NextResponse.json({ error: 'rolloutId is required' }, { status: 400 })
    await prisma.rollout.deleteMany({ where: { id: rolloutId, opportunityId: id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/opportunities/[id]/rollouts')
  }
}
