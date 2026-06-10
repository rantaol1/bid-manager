import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { loadProposalData } from '@/lib/documents/proposal-data'
import type { DeliverableType } from '@/lib/documents/proposal-sections'

type Params = { params: Promise<{ id: string }> }

/** Resolved proposal data (same shape the generator uses) for live previews. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const typeParam = req.nextUrl.searchParams.get('type')
    const type: DeliverableType = typeParam === 'board_summary' ? 'board_summary' : 'full_proposal'
    const data = await loadProposalData(id, type)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/proposal-data')
  }
}
