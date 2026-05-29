import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, getPagination } from '@/lib/api'
import { createOpportunitySchema } from '@/lib/schemas/opportunity'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { page, limit, skip, searchParams } = getPagination(req.url)
    const stage = searchParams.get('stage')?.trim()
    const customerId = searchParams.get('customerId')?.trim()
    const search = searchParams.get('search')?.trim()

    const where: Prisma.OpportunityWhereInput = {
      ...(stage ? { stage } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          _count: { select: { deliverables: true, teamMembers: true } },
        },
      }),
      prisma.opportunity.count({ where }),
    ])

    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities')
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth()
    const body = await req.json()
    const parsed = createOpportunitySchema.parse(body)

    const opportunity = await prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.create({
        data: {
          name: parsed.name,
          customerId: parsed.customerId,
          stage: parsed.stage,
          expectedValue: parsed.expectedValue ?? null,
          currency: parsed.currency,
          probability: parsed.probability ?? null,
          closeDate: parsed.closeDate,
          tags: parsed.tags,
          notes: parsed.notes || null,
          createdBy: userId,
        },
      })

      // Seed role configs from the default rate card so estimation is ready.
      const defaults = await tx.defaultRoleConfig.findMany({ orderBy: { sortOrder: 'asc' } })
      if (defaults.length > 0) {
        await tx.roleConfig.createMany({
          data: defaults.map((d) => ({
            opportunityId: opp.id,
            roleName: d.roleName,
            rate: d.rate,
            rateUnit: d.rateUnit,
            hoursPerDay: d.hoursPerDay,
            sortOrder: d.sortOrder,
          })),
        })
      }

      await tx.activity.create({
        data: {
          opportunityId: opp.id,
          type: 'created',
          description: `Opportunity "${opp.name}" created`,
          createdBy: userId,
        },
      })

      return opp
    })

    return NextResponse.json(opportunity, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities')
  }
}
