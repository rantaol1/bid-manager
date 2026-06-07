import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { rateCardSchema } from '@/lib/schemas/settings'

export async function GET() {
  try {
    await requireAuth()
    const roles = await prisma.defaultRoleConfig.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({
      data: roles.map((r) => ({
        id: r.id,
        roleName: r.roleName,
        rate: Number(r.rate),
        rateUnit: r.rateUnit,
        hoursPerDay: r.hoursPerDay,
        sortOrder: r.sortOrder,
      })),
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/settings/rate-card')
  }
}

/** Replace the full set of default role configs (the global rate card). Admin only. */
export async function PUT(req: NextRequest) {
  try {
    await requireRole(['admin'])
    const body = await req.json()
    const { roles } = rateCardSchema.parse(body)

    await prisma.$transaction(async (tx) => {
      const keepIds = roles.map((r) => r.id).filter((x): x is string => Boolean(x))
      await tx.defaultRoleConfig.deleteMany({ where: keepIds.length ? { id: { notIn: keepIds } } : {} })
      for (const role of roles) {
        const data = {
          roleName: role.roleName,
          rate: new Prisma.Decimal(role.rate),
          rateUnit: role.rateUnit,
          hoursPerDay: role.hoursPerDay,
          sortOrder: role.sortOrder,
        }
        if (role.id) {
          await tx.defaultRoleConfig.update({ where: { id: role.id }, data })
        } else {
          await tx.defaultRoleConfig.create({ data })
        }
      }
    })

    const updated = await prisma.defaultRoleConfig.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({
      data: updated.map((r) => ({
        id: r.id,
        roleName: r.roleName,
        rate: Number(r.rate),
        rateUnit: r.rateUnit,
        hoursPerDay: r.hoursPerDay,
        sortOrder: r.sortOrder,
      })),
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/settings/rate-card')
  }
}
