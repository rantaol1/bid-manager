import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { brandingSchema } from '@/lib/schemas/settings'

const SINGLETON_ID = 'singleton'

/** Load the branding singleton, seeding defaults on first read. */
export async function getBrandingSettings() {
  const existing = await prisma.brandingSettings.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) return existing
  return prisma.brandingSettings.create({ data: { id: SINGLETON_ID } })
}

export async function GET() {
  try {
    await requireAuth()
    const settings = await getBrandingSettings()
    return NextResponse.json({ data: settings })
  } catch (error) {
    return handleApiError(error, 'GET /api/settings/branding')
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(['admin'])
    const body = await req.json()
    const parsed = brandingSchema.parse(body)
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) continue
      if (key === 'templateSelections') {
        data[key] = value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)
      } else {
        data[key] = value
      }
    }
    const settings = await prisma.brandingSettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    })
    return NextResponse.json({ data: settings })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/settings/branding')
  }
}
