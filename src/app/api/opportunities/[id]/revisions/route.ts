import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { createRevisionSchema } from '@/lib/schemas/revisions'
import { loadEstimation } from '@/lib/estimation-data'
import { buildSnapshot, buildSummary } from '@/lib/revisions'

type Params = { params: Promise<{ id: string }> }

// List revisions for an opportunity. Omits the (potentially large) snapshot blob —
// the list view only needs `summary` for the cost/date columns.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const data = await prisma.estimationRevision.findMany({
      where: { opportunityId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        kind: true,
        note: true,
        summary: true,
        createdAt: true,
        createdBy: true,
      },
    })
    return NextResponse.json({ data })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/revisions')
  }
}

// Create a revision from the current working copy, or clone an existing one (fromRevisionId).
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { label, kind, note, fromRevisionId } = createRevisionSchema.parse(body)

    let snapshot: Prisma.InputJsonValue
    let summary: Prisma.InputJsonValue

    if (fromRevisionId) {
      const source = await prisma.estimationRevision.findFirst({
        where: { id: fromRevisionId, opportunityId: id },
        select: { snapshot: true, summary: true },
      })
      if (!source) return NextResponse.json({ error: 'Source revision not found' }, { status: 404 })
      snapshot = source.snapshot as unknown as Prisma.InputJsonValue
      summary = (source.summary ?? {}) as unknown as Prisma.InputJsonValue
    } else {
      const loaded = await loadEstimation(id)
      if (!loaded) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
      snapshot = buildSnapshot(loaded) as unknown as Prisma.InputJsonValue
      summary = buildSummary(loaded) as unknown as Prisma.InputJsonValue
    }

    const created = await prisma.$transaction(async (tx) => {
      const revision = await tx.estimationRevision.create({
        data: {
          opportunityId: id,
          label,
          kind,
          note: note ?? null,
          snapshot,
          summary,
          createdBy: userId,
        },
      })
      await tx.activity.create({
        data: {
          opportunityId: id,
          type: 'revision_created',
          description: `Saved estimation revision "${label}"`,
          metadata: { revisionId: revision.id, kind },
          createdBy: userId,
        },
      })
      return revision
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/revisions')
  }
}
