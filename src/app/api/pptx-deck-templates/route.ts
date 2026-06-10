import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { uploadFile } from '@/lib/storage'
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '@/lib/upload'
import { createPptxDeckTemplateSchema, defaultVisualSplice } from '@/lib/schemas/pptx-deck-template'
import { normalizePotxBuffer } from '@/lib/templates/normalize-potx'
import { parsePptxSlides } from '@/lib/templates/parse-pptx-slides'

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const kind = new URL(req.url).searchParams.get('kind') ?? undefined
    const templates = await prisma.pptxDeckTemplate.findMany({
      where: kind ? { deckKind: kind } : undefined,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ data: templates })
  } catch (error) {
    return handleApiError(error, 'GET /api/pptx-deck-templates')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['admin'])
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const parsed = createPptxDeckTemplateSchema.parse({
      name: (formData.get('name') as string | null)?.trim() || '',
      deckKind: (formData.get('deckKind') as string | null) || 'full_proposal',
    })

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (25 MB max)' }, { status: 400 })
    const byExt = /\.(potx|pptx)$/i.test(file.name)
    const okType = ALLOWED_TYPES.includes(file.type) || (file.type === 'application/octet-stream' && byExt)
    if (!okType || !byExt) {
      return NextResponse.json({ error: 'Upload a .potx or .pptx PowerPoint file' }, { status: 400 })
    }

    const raw = Buffer.from(await file.arrayBuffer())
    const { buffer, wasNormalized } = normalizePotxBuffer(raw)
    const slides = await parsePptxSlides(buffer)
    if (slides.length === 0) {
      return NextResponse.json({ error: 'The PowerPoint file has no slides to map' }, { status: 400 })
    }

    const normalizedName = file.name.replace(/\.potx$/i, '.pptx')
    const normalizedFile = new File([new Uint8Array(buffer)], normalizedName, { type: PPTX_MIME })
    const blob = await uploadFile(normalizedFile, 'pptx-deck-templates')

    const template = await prisma.pptxDeckTemplate.create({
      data: {
        name: parsed.name,
        deckKind: parsed.deckKind,
        isActive: false,
        fileUrl: blob.url,
        fileName: blob.fileName,
        mimeType: blob.mimeType,
        fileSize: blob.size,
        wasNormalized,
        slides: slides as unknown as Prisma.InputJsonValue,
        mapping: {
          sectionMap: {},
          genericSlides: [],
          visualSplice: defaultVisualSplice(parsed.deckKind),
        } as Prisma.InputJsonValue,
        createdBy: user.id,
      },
    })
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/pptx-deck-templates')
  }
}
