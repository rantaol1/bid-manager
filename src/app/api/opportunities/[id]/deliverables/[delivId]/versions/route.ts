import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { handleApiError } from '@/lib/api'
import { validateUpload } from '@/lib/upload'

type Params = { params: Promise<{ id: string; delivId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id, delivId } = await params

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: delivId, opportunityId: id },
      select: { id: true, name: true, currentVersion: true },
    })
    if (!deliverable) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const changeSummary = (formData.get('changeSummary') as string | null)?.trim() || null

    const validationError = validateUpload(file)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const blob = await uploadFile(file as File, `opportunities/${id}`)
    const nextVersion = deliverable.currentVersion + 1

    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliverableVersion.create({
        data: {
          deliverableId: delivId,
          version: nextVersion,
          fileUrl: blob.url,
          fileName: blob.fileName,
          fileSize: blob.size,
          mimeType: blob.mimeType,
          changeSummary,
          createdBy: userId,
        },
      })
      await tx.deliverable.update({ where: { id: delivId }, data: { currentVersion: nextVersion } })
      await tx.activity.create({
        data: {
          opportunityId: id,
          type: 'deliverable',
          description: `Uploaded v${nextVersion} of "${deliverable.name}"`,
          metadata: { deliverableId: delivId, version: nextVersion },
          createdBy: userId,
        },
      })
      return tx.deliverable.findUnique({
        where: { id: delivId },
        include: { versions: { orderBy: { version: 'desc' } } },
      })
    })

    return NextResponse.json(updated, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/deliverables/[delivId]/versions')
  }
}
