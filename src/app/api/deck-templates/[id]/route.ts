import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { updateDeckTemplateSchema } from '@/lib/schemas/deck-template'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const template = await prisma.deckTemplate.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    })
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    return NextResponse.json({ data: template })
  } catch (error) {
    return handleApiError(error, 'GET /api/deck-templates/[id]')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const { id } = await params
    const parsed = updateDeckTemplateSchema.parse(await req.json())

    const existing = await prisma.deckTemplate.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    // A defaultVersion must belong to this template.
    if (parsed.defaultVersionId) {
      const v = await prisma.deckTemplateVersion.findFirst({
        where: { id: parsed.defaultVersionId, templateId: id },
        select: { id: true },
      })
      if (!v) return NextResponse.json({ error: 'Version not found on this template' }, { status: 400 })
    }

    const template = await prisma.$transaction(async (tx) => {
      // Only one workspace-default per kind.
      if (parsed.isWorkspaceDefault === true) {
        await tx.deckTemplate.updateMany({
          where: { kind: existing.kind, isWorkspaceDefault: true, NOT: { id } },
          data: { isWorkspaceDefault: false },
        })
      }
      return tx.deckTemplate.update({
        where: { id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.description !== undefined ? { description: parsed.description } : {}),
          ...(parsed.isWorkspaceDefault !== undefined ? { isWorkspaceDefault: parsed.isWorkspaceDefault } : {}),
          ...(parsed.defaultVersionId !== undefined ? { defaultVersionId: parsed.defaultVersionId } : {}),
        },
        include: { versions: { orderBy: { version: 'desc' } } },
      })
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/deck-templates/[id]')
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const { id } = await params
    // Versions cascade-delete; ProposalContent FKs are SET NULL by the DB.
    await prisma.deckTemplate.delete({ where: { id } }).catch(() => {})
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/deck-templates/[id]')
  }
}
