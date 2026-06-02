import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { proposalContentSchema } from '@/lib/schemas/proposal'

type Params = { params: Promise<{ id: string }> }

/** JSON columns on ProposalContent — null must be written as DB NULL (use default). */
const JSON_FIELDS = new Set([
  'executiveSummary',
  'valueDrivers',
  'teamProfiles',
  'references',
  'raci',
  'crims',
  'methodologyPhases',
  'waysOfWorking',
  'governance',
  'customerCommitments',
  'dataMigrationSteps',
  'integrationSteps',
  'testingSteps',
  'adoptionSteps',
  'goLiveSteps',
  'whyArcwide',
])

/** Build a Prisma data object from validated input, omitting absent keys and
 *  mapping null JSON values to Prisma.DbNull so they fall back to defaults. */
function toPrismaData(parsed: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) continue
    if (JSON_FIELDS.has(key)) {
      data[key] = value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)
    } else {
      data[key] = value // string columns accept null directly
    }
  }
  return data
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const content = await prisma.proposalContent.findUnique({ where: { opportunityId: id } })
    return NextResponse.json({ data: content ?? {} })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/proposal-content')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = proposalContentSchema.parse(body)
    const data = toPrismaData(parsed as Record<string, unknown>)

    const content = await prisma.proposalContent.upsert({
      where: { opportunityId: id },
      update: data,
      create: { opportunityId: id, ...data } as Prisma.ProposalContentUncheckedCreateInput,
    })

    return NextResponse.json({ data: content })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/opportunities/[id]/proposal-content')
  }
}
