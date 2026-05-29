import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { addTeamMemberSchema } from '@/lib/schemas/opportunity'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const members = await prisma.teamMember.findMany({ where: { opportunityId: id } })
    return NextResponse.json({ data: members })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/team')
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = addTeamMemberSchema.parse(body)

    // POC: no Clerk directory lookup — derive a stable userId from the email or name.
    const userId = (parsed.userEmail || parsed.userName).toLowerCase().replace(/\s+/g, '-')

    const member = await prisma.teamMember.create({
      data: {
        opportunityId: id,
        userId,
        userName: parsed.userName,
        userEmail: parsed.userEmail || null,
        role: parsed.role,
      },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/team')
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const memberId = new URL(req.url).searchParams.get('memberId')
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    // Scope the delete to this opportunity to prevent cross-opportunity deletion.
    await prisma.teamMember.deleteMany({ where: { id: memberId, opportunityId: id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/opportunities/[id]/team')
  }
}
