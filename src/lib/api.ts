import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Translate thrown errors into consistent API responses.
 * Logs the real error server-side; never leaks internals to the client.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
  }

  if (error instanceof Error) {
    if (error.message === 'Unauthorised') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Sentinel errors from @/lib/ai (kept message-based so this file needn't import the SDK).
    if (error.message === 'AI_REFUSAL') {
      return NextResponse.json(
        { error: 'The AI declined to generate a suggestion for this request.' },
        { status: 422 }
      )
    }
    if (error.message === 'AI_RATE_LIMIT') {
      return NextResponse.json(
        { error: 'The AI service is busy. Please try again in a moment.' },
        { status: 429 }
      )
    }
    if (error.message === 'AI_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'The AI service is unavailable. Please try again.' },
        { status: 502 }
      )
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 })
    }
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete: this record is still referenced by other records' },
        { status: 409 }
      )
    }
  }

  console.error(`[API Error] ${context}:`, error instanceof Error ? error.message : error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

/** Normalise optional string fields: trim and convert empty strings to null for storage. */
export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj }
  for (const key of Object.keys(out)) {
    if (out[key] === '') {
      ;(out as Record<string, unknown>)[key] = null
    }
  }
  return out
}

/** Parse pagination params from a request URL. */
export function getPagination(url: string) {
  const { searchParams } = new URL(url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
  return { page, limit, skip: (page - 1) * limit, searchParams }
}
