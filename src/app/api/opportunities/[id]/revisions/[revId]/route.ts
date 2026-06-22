import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { updateRevisionSchema } from '@/lib/schemas/revisions'

type Params = { params: Promise<{ id: string; revId: string }> }

// Full single revision, including the snapshot blob.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, revId } = await params
    const revision = await prisma.estimationRevision.findFirst({
      where: { id: revId, opportunityId: id },
    })
    if (!revision) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
    return NextResponse.json({ data: revision })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/revisions/[revId]')
  }
}

// Rename / edit note. Ownership check guards against cross-opportunity edits.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, revId } = await params
    const body = await req.json()
    const parsed = updateRevisionSchema.parse(body)

    const existing = await prisma.estimationRevision.findFirst({
      where: { id: revId, opportunityId: id },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

    const data: { label?: string; note?: string | null } = {}
    if (parsed.label !== undefined) data.label = parsed.label
    if (parsed.note !== undefined) data.note = parsed.note

    const updated = await prisma.estimationRevision.update({ where: { id: revId }, data })
    return NextResponse.json({ data: updated })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/opportunities/[id]/revisions/[revId]')
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, revId } = await params
    const existing = await prisma.estimationRevision.findFirst({
      where: { id: revId, opportunityId: id },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
    await prisma.estimationRevision.delete({ where: { id: revId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/opportunities/[id]/revisions/[revId]')
  }
}
