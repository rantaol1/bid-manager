import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { proposalDefaultsSchema } from '@/lib/schemas/proposal'
import { BUILTIN_STRUCTURED_CONTENT } from '@/lib/documents/slides/static-content'

const SINGLETON_ID = 'singleton'

/** Load the global defaults singleton, lazily seeding it from built-ins if absent. */
export async function getProposalDefaults() {
  const existing = await prisma.proposalDefaults.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) return existing
  return prisma.proposalDefaults.create({
    data: {
      id: SINGLETON_ID,
      ...(BUILTIN_STRUCTURED_CONTENT as unknown as object),
    } as Prisma.ProposalDefaultsCreateInput,
  })
}

export async function GET() {
  try {
    await requireAuth()
    const defaults = await getProposalDefaults()
    return NextResponse.json({ data: defaults })
  } catch (error) {
    return handleApiError(error, 'GET /api/proposal-defaults')
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(['admin'])
    const body = await req.json()
    const parsed = proposalDefaultsSchema.parse(body)
    const data = parsed as unknown as Prisma.ProposalDefaultsUncheckedUpdateInput

    const defaults = await prisma.proposalDefaults.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...(parsed as unknown as object) } as Prisma.ProposalDefaultsCreateInput,
    })

    return NextResponse.json({ data: defaults })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/proposal-defaults')
  }
}
