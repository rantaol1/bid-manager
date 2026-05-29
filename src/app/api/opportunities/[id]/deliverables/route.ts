import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { handleApiError } from '@/lib/api'
import { validateUpload } from '@/lib/upload'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const deliverables = await prisma.deliverable.findMany({
      where: { opportunityId: id },
      orderBy: { updatedAt: 'desc' },
      include: { versions: { orderBy: { version: 'desc' } } },
    })
    return NextResponse.json({ data: deliverables })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/deliverables')
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string | null)?.trim()
    const type = ((formData.get('type') as string | null)?.trim() || 'upload').slice(0, 40)
    const description = (formData.get('description') as string | null)?.trim() || null

    const validationError = validateUpload(file)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const blob = await uploadFile(file as File, `opportunities/${id}`)

    const deliverable = await prisma.$transaction(async (tx) => {
      const created = await tx.deliverable.create({
        data: { opportunityId: id, name, type, description, currentVersion: 1, createdBy: userId },
      })
      await tx.deliverableVersion.create({
        data: {
          deliverableId: created.id,
          version: 1,
          fileUrl: blob.url,
          fileName: blob.fileName,
          fileSize: blob.size,
          mimeType: blob.mimeType,
          createdBy: userId,
        },
      })
      await tx.activity.create({
        data: {
          opportunityId: id,
          type: 'deliverable',
          description: `Added deliverable "${name}"`,
          metadata: { deliverableId: created.id },
          createdBy: userId,
        },
      })
      return tx.deliverable.findUnique({
        where: { id: created.id },
        include: { versions: { orderBy: { version: 'desc' } } },
      })
    })

    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/deliverables')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const deliverableId = new URL(req.url).searchParams.get('deliverableId')
    if (!deliverableId) return NextResponse.json({ error: 'deliverableId is required' }, { status: 400 })
    await prisma.deliverable.deleteMany({ where: { id: deliverableId, opportunityId: id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/opportunities/[id]/deliverables')
  }
}
