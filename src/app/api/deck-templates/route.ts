import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { createDeckTemplateSchema } from '@/lib/schemas/deck-template'
import { buildDefaultVersionContent, versionContentToPrismaData } from '@/lib/deck-templates'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const kind = new URL(req.url).searchParams.get('kind') ?? undefined
    const templates = await prisma.deckTemplate.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ isWorkspaceDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, label: true, createdAt: true },
        },
      },
    })
    return NextResponse.json({ data: templates })
  } catch (error) {
    return handleApiError(error, 'GET /api/deck-templates')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['admin'])
    const parsed = createDeckTemplateSchema.parse(await req.json())

    const content = await buildDefaultVersionContent(parsed.kind)
    const versionData = versionContentToPrismaData(content as Record<string, unknown>)

    const template = await prisma.$transaction(async (tx) => {
      const t = await tx.deckTemplate.create({
        data: {
          name: parsed.name,
          description: parsed.description ?? null,
          kind: parsed.kind,
          createdBy: user.id,
        },
      })
      const v = await tx.deckTemplateVersion.create({
        data: {
          templateId: t.id,
          version: 1,
          createdBy: user.id,
          ...versionData,
        } as Prisma.DeckTemplateVersionUncheckedCreateInput,
      })
      return tx.deckTemplate.update({
        where: { id: t.id },
        data: { defaultVersionId: v.id },
        include: { versions: { orderBy: { version: 'desc' } } },
      })
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/deck-templates')
  }
}
