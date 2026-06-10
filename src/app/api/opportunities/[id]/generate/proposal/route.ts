import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { loadProposalData } from '@/lib/documents/proposal-data'
import { generateProposalPptx } from '@/lib/documents/generate-proposal'
import { generateFromPptxTemplate } from '@/lib/documents/generate-from-pptx-template'
import { saveGeneratedDeliverable } from '@/lib/documents/save-generated'
import { getFileBuffer } from '@/lib/storage'
import { generateProposalSchema } from '@/lib/schemas/proposal'
import type { PptxMapping } from '@/lib/schemas/pptx-deck-template'

// The .potx compose + token-fill path is heavier than the code-drawn deck.
export const runtime = 'nodejs'
export const maxDuration = 60

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
    const { type, selectedSections, pptxTemplateId } = generateProposalSchema.parse(body)

    const data = await loadProposalData(id, type)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const meta = META[type]

    // Next version of this deliverable type (drives the cover version label).
    const existing = await prisma.deliverable.findFirst({
      where: { opportunityId: id, type: meta.type },
      orderBy: { createdAt: 'asc' },
      select: { currentVersion: true },
    })
    const version = existing ? existing.currentVersion + 1 : 1

    // REPLACE mode: a chosen .potx template (string) is used for this generation; null
    // forces the built-in design; undefined falls back to the active template (if any).
    let activeTemplate =
      pptxTemplateId === undefined
        ? await prisma.pptxDeckTemplate.findFirst({ where: { deckKind: type, isActive: true } })
        : pptxTemplateId
          ? await prisma.pptxDeckTemplate.findUnique({ where: { id: pptxTemplateId } })
          : null
    if (activeTemplate && activeTemplate.deckKind !== type) activeTemplate = null

    let buffer: Buffer
    if (activeTemplate) {
      const potxBuffer = await getFileBuffer(activeTemplate.fileUrl)
      if (!potxBuffer) return NextResponse.json({ error: 'Template file not found' }, { status: 404 })
      buffer = await generateFromPptxTemplate({
        data,
        type,
        potxBuffer,
        mapping: activeTemplate.mapping as unknown as PptxMapping,
      })
    } else {
      // Fall back to the chosen deck version's section selection when the client omits one.
      const sections =
        selectedSections ??
        Object.entries(data.sectionSelection)
          .filter(([, on]) => on)
          .map(([sectionId]) => sectionId)
      if (sections.length === 0) {
        return NextResponse.json({ error: 'No sections selected for this deck' }, { status: 400 })
      }
      buffer = await generateProposalPptx({ type, selectedSections: sections, data, version })
    }

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
