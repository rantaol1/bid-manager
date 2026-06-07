import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { generateFromDocxTemplate } from '@/lib/documents/generate-from-docx-template'
import { saveGeneratedDeliverable } from '@/lib/documents/save-generated'
import { getBrandingSettings } from '@/app/api/settings/branding/route'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const bodySchema = z.object({ templateId: z.string().min(1) })
type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const { templateId } = bodySchema.parse(await req.json())

    const template = await prisma.template.findUnique({ where: { id: templateId } })
    if (!template || template.kind !== 'docx_template') {
      return NextResponse.json({ error: 'DOCX template not found' }, { status: 404 })
    }

    const branding = await getBrandingSettings()
    const buffer = await generateFromDocxTemplate({
      opportunityId: id,
      templateUrl: template.fileUrl,
      companyName: branding.companyName,
    })

    const safe = template.name.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase()
    const deliverable = await saveGeneratedDeliverable({
      opportunityId: id,
      userId,
      name: template.name,
      type: `template:${template.id}`,
      fileName: `${safe || 'document'}.docx`,
      mimeType: DOCX_MIME,
      buffer,
    })
    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/generate/from-template')
  }
}
