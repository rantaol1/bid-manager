import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { loadProposalData } from '@/lib/documents/proposal-data'
import { generateProposalPptx } from '@/lib/documents/generate-proposal'
import { saveGeneratedDeliverable } from '@/lib/documents/save-generated'
import { generateProposalSchema } from '@/lib/schemas/proposal'

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
type Params = { params: Promise<{ id: string }> }

const META = {
  full_proposal: { type: 'proposal', name: 'Full Proposal', fileName: 'full-proposal.pptx' },
  board_summary: { type: 'board_summary', name: 'Board Summary', fileName: 'board-summary.pptx' },
} as const

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { type, selectedSections } = generateProposalSchema.parse(body)

    const data = await loadProposalData(id)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const meta = META[type]

    // Next version of this deliverable type (drives the cover version label).
    const existing = await prisma.deliverable.findFirst({
      where: { opportunityId: id, type: meta.type },
      orderBy: { createdAt: 'asc' },
      select: { currentVersion: true },
    })
    const version = existing ? existing.currentVersion + 1 : 1

    const buffer = await generateProposalPptx({ type, selectedSections, data, version })

    const deliverable = await saveGeneratedDeliverable({
      opportunityId: id,
      userId,
      name: meta.name,
      type: meta.type,
      fileName: meta.fileName,
      mimeType: PPTX_MIME,
      buffer,
    })

    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/generate/proposal')
  }
}
