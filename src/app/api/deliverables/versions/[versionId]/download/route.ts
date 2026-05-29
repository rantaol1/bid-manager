import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { getFile } from '@/lib/storage'

type Params = { params: Promise<{ versionId: string }> }

/**
 * Stream a deliverable file. The Blob store is private, so blob URLs are not
 * publicly fetchable — downloads are proxied here behind authentication.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { versionId } = await params

    const version = await prisma.deliverableVersion.findUnique({ where: { id: versionId } })
    if (!version) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const file = await getFile(version.fileUrl)
    if (!file || !file.stream) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const safeName = version.fileName.replace(/["\\\r\n]/g, '_')
    return new NextResponse(file.stream, {
      headers: {
        'Content-Type': version.mimeType || file.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(version.fileName)}`,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/deliverables/versions/[versionId]/download')
  }
}
