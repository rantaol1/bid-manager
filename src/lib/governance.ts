import { GOVERNANCE } from '@/lib/documents/slides/static-content'
import type { GovernanceBody, GovernanceContent, GovernanceIcon } from '@/types'

const VALID_ICONS: GovernanceIcon[] = ['clipboard', 'gauge', 'pin']

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function normalizeBody(v: unknown, fallbackIcon: GovernanceIcon): GovernanceBody {
  const b = (v ?? {}) as Partial<GovernanceBody>
  return {
    name: typeof b.name === 'string' ? b.name : '',
    cadence: typeof b.cadence === 'string' ? b.cadence : '',
    icon: VALID_ICONS.includes(b.icon as GovernanceIcon) ? (b.icon as GovernanceIcon) : fallbackIcon,
    customerParticipants: asStringArray(b.customerParticipants),
    partnerParticipants: asStringArray(b.partnerParticipants),
    responsibilities: asStringArray(b.responsibilities),
  }
}

/**
 * Coerce stored governance JSON into the current bodies shape. The DB may still
 * hold the legacy `{ steering, pmo, workstreams }` shape (governance is read as
 * raw JSON, not Zod-validated on read). Anything without a `bodies` array falls
 * back to the builtin default. Mirrors `normalizeRaci`.
 */
export function normalizeGovernance(value: unknown): GovernanceContent {
  if (value && typeof value === 'object' && Array.isArray((value as GovernanceContent).bodies)) {
    const bodies = (value as GovernanceContent).bodies
    if (bodies.length === 0) return { bodies: [] }
    return { bodies: bodies.map((b, i) => normalizeBody(b, VALID_ICONS[i % VALID_ICONS.length])) }
  }
  return GOVERNANCE
}

/** Replace `{customer}` / `{partner}` tokens at render time (not stored). */
export function applyGovTokens(s: string, ctx: { customer: string; partner: string }): string {
  return s.replaceAll('{customer}', ctx.customer).replaceAll('{partner}', ctx.partner)
}
