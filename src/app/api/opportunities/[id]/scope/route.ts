import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { scopeSchema } from '@/lib/schemas/scope'
import { SCOPE_PHASES_DEFAULT } from '@/lib/constants/ifs-modules'

type Params = { params: Promise<{ id: string }> }

const EMPTY_SCOPE = {
  modules: {},
  phases: SCOPE_PHASES_DEFAULT,
  requirements: [],
  assumptions: [],
  exclusions: [],
  deferred: [],
  risks: [],
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const scope = await prisma.scope.findUnique({ where: { opportunityId: id } })
    if (!scope) return NextResponse.json({ data: EMPTY_SCOPE })
    const phases = Array.isArray(scope.scopePhases) ? scope.scopePhases : []
    return NextResponse.json({
      data: {
        modules: scope.modules,
        // Fall back to the default legend so the map always has a usable palette.
        phases: phases.length > 0 ? phases : SCOPE_PHASES_DEFAULT,
        requirements: scope.requirements,
        assumptions: scope.assumptions,
        exclusions: scope.exclusions,
        deferred: scope.deferred,
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
      scopePhases: parsed.phases as unknown as Prisma.InputJsonValue,
      requirements: parsed.requirements as unknown as Prisma.InputJsonValue,
      assumptions: parsed.assumptions,
      exclusions: parsed.exclusions,
      deferred: parsed.deferred,
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
