import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { createDeckVersionSchema } from '@/lib/schemas/deck-template'
import { versionContentToPrismaData } from '@/lib/deck-templates'

type Params = { params: Promise<{ id: string }> }

/** Create a new (immutable) version of a deck template from the submitted content. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole(['admin'])
    const { id } = await params
    const parsed = createDeckVersionSchema.parse(await req.json())

    const template = await prisma.deckTemplate.findUnique({ where: { id }, select: { id: true } })
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const versionData = versionContentToPrismaData(parsed.content as Record<string, unknown>)

    const version = await prisma.$transaction(async (tx) => {
      const last = await tx.deckTemplateVersion.findFirst({
        where: { templateId: id },
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      const next = (last?.version ?? 0) + 1
      const created = await tx.deckTemplateVersion.create({
        data: {
          templateId: id,
          version: next,
          label: parsed.label ?? null,
          createdBy: user.id,
          ...versionData,
        } as Prisma.DeckTemplateVersionUncheckedCreateInput,
      })
      if (parsed.setAsDefault) {
        await tx.deckTemplate.update({ where: { id }, data: { defaultVersionId: created.id } })
      }
      return created
    })

    return NextResponse.json({ data: version }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/deck-templates/[id]/versions')
  }
}
