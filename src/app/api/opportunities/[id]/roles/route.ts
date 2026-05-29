import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { saveRolesSchema } from '@/lib/schemas/estimation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const roles = await prisma.roleConfig.findMany({
      where: { opportunityId: id },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ data: roles })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/roles')
  }
}

// Replace the full set of role configs for an opportunity.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { roles } = saveRolesSchema.parse(body)

    await prisma.$transaction(async (tx) => {
      const keepIds = roles.map((r) => r.id).filter((x): x is string => Boolean(x))

      // Delete roles that were removed (cascades to their allocations).
      await tx.roleConfig.deleteMany({
        where: { opportunityId: id, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) },
      })

      for (const role of roles) {
        if (role.id) {
          await tx.roleConfig.update({
            where: { id: role.id },
            data: {
              roleName: role.roleName,
              rate: role.rate,
              rateUnit: role.rateUnit,
              hoursPerDay: role.hoursPerDay,
              sortOrder: role.sortOrder,
            },
          })
        } else {
          await tx.roleConfig.create({
            data: {
              opportunityId: id,
              roleName: role.roleName,
              rate: role.rate,
              rateUnit: role.rateUnit,
              hoursPerDay: role.hoursPerDay,
              sortOrder: role.sortOrder,
            },
          })
        }
      }
    })

    const updated = await prisma.roleConfig.findMany({
      where: { opportunityId: id },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    return handleApiError(error, 'PUT /api/opportunities/[id]/roles')
  }
}
