import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { revisionSnapshotSchema } from '@/lib/schemas/revisions'
import { restoreTransaction } from '@/lib/revisions'

type Params = { params: Promise<{ id: string; revId: string }> }

// Overwrite the live estimation working copy from a revision's snapshot.
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id, revId } = await params

    const revision = await prisma.estimationRevision.findFirst({
      where: { id: revId, opportunityId: id },
      select: { id: true, label: true, snapshot: true },
    })
    if (!revision) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

    const snapshot = revisionSnapshotSchema.parse(revision.snapshot)

    await prisma.$transaction(
      async (tx) => {
        await restoreTransaction(tx, id, snapshot)
        await tx.activity.create({
          data: {
            opportunityId: id,
            type: 'revision_restored',
            description: `Restored estimation revision "${revision.label}"`,
            metadata: { revisionId: revision.id },
            createdBy: userId,
          },
        })
      },
      { timeout: 20000 }
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/revisions/[revId]/restore')
  }
}
