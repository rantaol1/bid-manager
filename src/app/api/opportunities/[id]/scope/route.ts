import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { scopeSchema } from '@/lib/schemas/scope'

type Params = { params: Promise<{ id: string }> }

const EMPTY_SCOPE = {
  modules: {},
  requirements: [],
  assumptions: [],
  exclusions: [],
  risks: [],
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const scope = await prisma.scope.findUnique({ where: { opportunityId: id } })
    if (!scope) return NextResponse.json({ data: EMPTY_SCOPE })
    return NextResponse.json({
      data: {
        modules: scope.modules,
        requirements: scope.requirements,
        assumptions: scope.assumptions,
        exclusions: scope.exclusions,
        risks: scope.risks,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/scope')
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = scopeSchema.parse(body)

    const data = {
      modules: parsed.modules as Prisma.InputJsonValue,
      requirements: parsed.requirements as unknown as Prisma.InputJsonValue,
      assumptions: parsed.assumptions,
      exclusions: parsed.exclusions,
      risks: parsed.risks as unknown as Prisma.InputJsonValue,
    }

    const scope = await prisma.scope.upsert({
      where: { opportunityId: id },
      update: data,
      create: { opportunityId: id, ...data },
    })

    return NextResponse.json({ data: scope })
  } catch (error) {
    return handleApiError(error, 'PUT /api/opportunities/[id]/scope')
  }
}
