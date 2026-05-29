import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { loadDocData } from '@/lib/documents/doc-data'
import { generateTimelinePptx } from '@/lib/documents/generate-timeline-pptx'
import { saveGeneratedDeliverable } from '@/lib/documents/save-generated'

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const data = await loadDocData(id)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const buffer = await generateTimelinePptx(data)
    const deliverable = await saveGeneratedDeliverable({
      opportunityId: id,
      userId,
      name: 'Project Timeline',
      type: 'timeline',
      fileName: 'project-timeline.pptx',
      mimeType: PPTX_MIME,
      buffer,
    })
    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/generate/timeline')
  }
}
