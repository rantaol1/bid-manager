import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { uploadFile, deleteFile } from '@/lib/storage'
import { validateUpload } from '@/lib/upload'
import { createTemplateSchema } from '@/lib/schemas/template'
import { extractText } from '@/lib/templates/extract-text'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const kind = new URL(req.url).searchParams.get('kind') ?? undefined
    const templates = await prisma.template.findMany({
      where: kind ? { kind } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: templates })
  } catch (error) {
    return handleApiError(error, 'GET /api/templates')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['admin'])
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const parsed = createTemplateSchema.parse({
      name: (formData.get('name') as string | null)?.trim() || '',
      kind: (formData.get('kind') as string | null) || 'text_source',
      category: (formData.get('category') as string | null)?.trim() || undefined,
    })

    const validationError = validateUpload(file)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const mime = (file as File).type
    if (mime !== DOCX_MIME && mime !== PPTX_MIME) {
      return NextResponse.json({ error: 'Templates must be .docx or .pptx files' }, { status: 400 })
    }
    const docType = mime === DOCX_MIME ? 'docx' : 'pptx'
    if (parsed.kind === 'docx_template' && docType !== 'docx') {
      return NextResponse.json({ error: 'DOCX templates must be .docx files' }, { status: 400 })
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer())
    const blob = await uploadFile(file as File, 'templates')

    // For text sources, extract reusable standard text up front.
    let extractedText: string | null = null
    let snippets: Prisma.InputJsonValue | undefined
    if (parsed.kind === 'text_source') {
      try {
        const result = await extractText(buffer, docType)
        extractedText = result.text
        snippets = result.snippets as unknown as Prisma.InputJsonValue
      } catch {
        extractedText = null
      }
    }

    const template = await prisma.template.create({
      data: {
        name: parsed.name,
        kind: parsed.kind,
        docType,
        category: parsed.category ?? null,
        fileUrl: blob.url,
        fileName: blob.fileName,
        mimeType: blob.mimeType,
        fileSize: blob.size,
        extractedText,
        ...(snippets !== undefined ? { snippets } : {}),
        createdBy: user.id,
      },
    })
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/templates')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole(['admin'])
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const template = await prisma.template.findUnique({ where: { id } })
    if (template) {
      await deleteFile(template.fileUrl).catch(() => {})
      await prisma.template.delete({ where: { id } })
    }
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/templates')
  }
}
