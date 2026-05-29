import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { loadDocData } from '@/lib/documents/doc-data'
import { generatePricingDocx } from '@/lib/documents/generate-pricing'
import { saveGeneratedDeliverable } from '@/lib/documents/save-generated'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const data = await loadDocData(id)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const buffer = await generatePricingDocx(data)
    const deliverable = await saveGeneratedDeliverable({
      opportunityId: id,
      userId,
      name: 'Pricing Summary',
      type: 'pricing',
      fileName: 'pricing-summary.docx',
      mimeType: DOCX_MIME,
      buffer,
    })
    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/generate/pricing')
  }
}
