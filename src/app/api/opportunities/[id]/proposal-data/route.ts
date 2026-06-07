import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { loadProposalData } from '@/lib/documents/proposal-data'

type Params = { params: Promise<{ id: string }> }

/** Resolved proposal data (same shape the generator uses) for live previews. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const data = await loadProposalData(id)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/proposal-data')
  }
}
