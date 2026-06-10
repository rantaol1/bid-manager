import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'

type Params = { params: Promise<{ id: string; versionId: string }> }

/** Full editable snapshot of one version (feeds the deck editor). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, versionId } = await params
    const version = await prisma.deckTemplateVersion.findFirst({
      where: { id: versionId, templateId: id },
    })
    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    return NextResponse.json({ data: version })
  } catch (error) {
    return handleApiError(error, 'GET /api/deck-templates/[id]/versions/[versionId]')
  }
}
