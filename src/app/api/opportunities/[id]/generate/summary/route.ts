import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { loadDocData } from '@/lib/documents/doc-data'
import { generateSummaryPptx } from '@/lib/documents/generate-summary-pptx'
import { saveGeneratedDeliverable } from '@/lib/documents/save-generated'

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const data = await loadDocData(id)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const buffer = await generateSummaryPptx(data)
    const deliverable = await saveGeneratedDeliverable({
      opportunityId: id,
      userId,
      name: 'Executive Summary',
      type: 'summary',
      fileName: 'executive-summary.pptx',
      mimeType: PPTX_MIME,
      buffer,
    })
    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/generate/summary')
  }
}
