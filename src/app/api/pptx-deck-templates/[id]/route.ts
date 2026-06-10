import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { deleteFile } from '@/lib/storage'
import { updatePptxDeckTemplateSchema } from '@/lib/schemas/pptx-deck-template'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const template = await prisma.pptxDeckTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    return NextResponse.json({ data: template })
  } catch (error) {
    return handleApiError(error, 'GET /api/pptx-deck-templates/[id]')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const { id } = await params
    const parsed = updatePptxDeckTemplateSchema.parse(await req.json())

    const existing = await prisma.pptxDeckTemplate.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const template = await prisma.$transaction(async (tx) => {
      // Only one active template per deck kind (replace mode).
      if (parsed.isActive === true) {
        await tx.pptxDeckTemplate.updateMany({
          where: { deckKind: existing.deckKind, isActive: true, NOT: { id } },
          data: { isActive: false },
        })
      }
      return tx.pptxDeckTemplate.update({
        where: { id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
          ...(parsed.mapping !== undefined ? { mapping: parsed.mapping as unknown as Prisma.InputJsonValue } : {}),
        },
      })
    })
    return NextResponse.json({ data: template })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/pptx-deck-templates/[id]')
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const { id } = await params
    const template = await prisma.pptxDeckTemplate.findUnique({ where: { id } })
    if (template) {
      await deleteFile(template.fileUrl).catch(() => {})
      await prisma.pptxDeckTemplate.delete({ where: { id } })
    }
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/pptx-deck-templates/[id]')
  }
}
