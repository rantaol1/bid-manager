import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, emptyToNull, getPagination } from '@/lib/api'
import { createCustomerSchema } from '@/lib/schemas/customer'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { page, limit, skip, searchParams } = getPagination(req.url)
    const search = searchParams.get('search')?.trim()

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { industry: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { opportunities: true } } },
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/customers')
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth()
    const body = await req.json()
    const parsed = createCustomerSchema.parse(body)
    const created = await prisma.customer.create({
      data: { ...emptyToNull(parsed), createdBy: userId },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/customers')
  }
}
