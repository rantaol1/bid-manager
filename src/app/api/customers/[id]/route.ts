import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, emptyToNull } from '@/lib/api'
import { updateCustomerSchema } from '@/lib/schemas/customer'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        opportunities: {
          orderBy: { updatedAt: 'desc' },
          select: { id: true, name: true, stage: true, expectedValue: true, currency: true, updatedAt: true },
        },
      },
    })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer)
  } catch (error) {
    return handleApiError(error, 'GET /api/customers/[id]')
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = updateCustomerSchema.parse(body)
    const updated = await prisma.customer.update({
      where: { id },
      data: emptyToNull(parsed),
    })
    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, 'PATCH /api/customers/[id]')
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin', 'bid_manager'])
    const { id } = await params
    await prisma.customer.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/customers/[id]')
  }
}
