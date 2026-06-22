import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { anthropic } from '@/lib/ai/client'
import type { LoadedEstimation } from '@/lib/estimation-data'
import type { ScopeFilter } from '@/lib/schemas/suggest'

const MODEL = 'claude-opus-4-8'

/** Compact scope context fed to the model (digested by the caller from the Scope row). */
export interface ScopeSignals {
  moduleNames: string[]
  requirementCount: number
  requirementsByPriority: Record<string, number>
  requirementsByFitGap: Record<string, number>
  riskTitles: string[]
  assumptions: string[]
}

export interface InScopePhase {
  id: string
  rolloutName: string
  phaseName: string
  workingDays: number
  startDate: string
  endDate: string
}

export interface SuggestInput {
  loaded: LoadedEstimation
  scope: ScopeSignals | null
  targetCost: number
  scopeFilter: ScopeFilter
  guidance?: string
}

export interface SuggestResult {
  allocations: { phaseId: string; roleConfigId: string; percentage: number }[]
  rationale: string
  assumptions: string[]
}

/** Phases included in the requested scope (whole project, one rollout, or one phase). */
export function selectInScopePhases(loaded: LoadedEstimation, filter: ScopeFilter): InScopePhase[] {
  const out: InScopePhase[] = []
  for (const ro of loaded.rollouts) {
    for (const p of ro.phases) {
      const inScope =
        filter.type === 'project' ||
        (filter.type === 'rollout' && ro.id === filter.rolloutId) ||
        (filter.type === 'phase' && p.id === filter.phaseId)
      if (inScope) {
        out.push({
          id: p.id,
          rolloutName: ro.name,
          phaseName: p.name,
          workingDays: p.workingDays,
          startDate: p.startDate,
          endDate: p.endDate,
        })
      }
    }
  }
  return out
}

// Raw JSON schema for structured output. Constraints like min/max are intentionally
// omitted (the API strips them); percentages are clamped server-side after the call.
const SUGGESTION_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    allocations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          phaseId: { type: 'string' },
          roleName: { type: 'string' },
          percentage: { type: 'number' },
        },
        required: ['phaseId', 'roleName', 'percentage'],
      },
    },
    rationale: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['allocations', 'rationale', 'assumptions'],
}

const suggestionValidator = z.object({
  allocations: z.array(
    z.object({ phaseId: z.string(), roleName: z.string(), percentage: z.number() })
  ),
  rationale: z.string(),
  assumptions: z.array(z.string()),
})

const SYSTEM_PROMPT = `You are an IFS Cloud implementation delivery estimator at a consultancy. You allocate consulting role effort across project phases to meet a target professional-services fee.

How cost is computed — use this exactly to self-check your numbers:
- For one role in one phase: days = (percentage / 100) * phase.workingDays; cost = days * role.dayRate.
- The fee for the chosen scope is the sum of those costs over every (phase, role) pair you staff.
- "percentage" is an allocation level from 0 to 100 (a role's share of a phase). Never exceed 100 or go below 0.

Produce a realistic role mix per IFS delivery norms:
- Project Manager: steady light-to-moderate load across all phases (~15-30%).
- Solution Architect: heavier early (design), lighter later.
- Functional/Technical Consultants: heaviest during build and configuration phases.
- Test roles ramp up before each go-live.
- Data Migration / Integration specialists concentrate where the scope implies that work.
Only staff a role in a phase where it makes delivery sense; otherwise leave that pair out.

Make the total fee land as close to the target as you reasonably can while keeping the mix realistic. Return only the structured object.`

function formatCounts(rec: Record<string, number>): string {
  return Object.entries(rec)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')
}

function buildUserPrompt(input: SuggestInput, phases: InScopePhase[]): string {
  const { loaded, scope, targetCost, scopeFilter, guidance } = input
  const scopeLabel =
    scopeFilter.type === 'project'
      ? 'the whole project'
      : scopeFilter.type === 'rollout'
        ? `rollout "${phases[0]?.rolloutName ?? ''}"`
        : `phase "${phases[0]?.phaseName ?? ''}"`

  const lines: string[] = []
  lines.push(`Target fee for ${scopeLabel}: ${targetCost} ${loaded.opportunity.currency}.`)
  lines.push('')
  lines.push('Roles (name — day rate):')
  for (const r of loaded.roleConfigs) lines.push(`- ${r.roleName} — ${r.rate}`)
  lines.push('')
  lines.push('In-scope phases (phaseId | rollout · phase | workingDays | dates):')
  for (const p of phases) {
    lines.push(
      `- ${p.id} | ${p.rolloutName} · ${p.phaseName} | ${p.workingDays}d | ${p.startDate.slice(0, 10)}→${p.endDate.slice(0, 10)}`
    )
  }

  if (scope) {
    lines.push('')
    lines.push('Scope signals:')
    if (scope.moduleNames.length) lines.push(`- Modules in scope: ${scope.moduleNames.join(', ')}`)
    const reqExtra = [
      Object.keys(scope.requirementsByPriority).length
        ? `priority ${formatCounts(scope.requirementsByPriority)}`
        : '',
      Object.keys(scope.requirementsByFitGap).length
        ? `fit/gap ${formatCounts(scope.requirementsByFitGap)}`
        : '',
    ]
      .filter(Boolean)
      .join('; ')
    lines.push(`- Requirements: ${scope.requirementCount}${reqExtra ? ` (${reqExtra})` : ''}`)
    if (scope.riskTitles.length) lines.push(`- Risks: ${scope.riskTitles.slice(0, 8).join('; ')}`)
    if (scope.assumptions.length) lines.push(`- Assumptions: ${scope.assumptions.slice(0, 8).join('; ')}`)
  }

  if (guidance && guidance.trim()) {
    lines.push('')
    lines.push(`Additional guidance from the estimator: ${guidance.trim()}`)
  }

  lines.push('')
  lines.push(`Use ONLY these phaseIds: ${phases.map((p) => p.id).join(', ')}.`)
  lines.push(`Use ONLY these role names, exactly: ${loaded.roleConfigs.map((r) => r.roleName).join(', ')}.`)
  lines.push(
    'Return a percentage (0-100) for each (phaseId, roleName) you choose to staff so the computed fee approximates the target.'
  )
  return lines.join('\n')
}

/**
 * Ask Claude for an allocation suggestion. Returns roleConfigId-based allocations
 * (roleName→id resolved here, unknowns dropped). Throws stable sentinel errors
 * (AI_REFUSAL / AI_RATE_LIMIT / AI_UNAVAILABLE) translated by handleApiError.
 */
export async function suggestAllocations(input: SuggestInput): Promise<SuggestResult> {
  const phases = selectInScopePhases(input.loaded, input.scopeFilter)
  const userPrompt = buildUserPrompt(input, phases)

  let message: Anthropic.Message
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SUGGESTION_JSON_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new Error('AI_RATE_LIMIT')
    throw new Error('AI_UNAVAILABLE')
  }

  if (message.stop_reason === 'refusal') throw new Error('AI_REFUSAL')

  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text
  if (!text) throw new Error('AI_UNAVAILABLE')

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('AI_UNAVAILABLE')
  }
  const parsed = suggestionValidator.safeParse(raw)
  if (!parsed.success) throw new Error('AI_UNAVAILABLE')

  const nameToId = new Map(input.loaded.roleConfigs.map((r) => [r.roleName, r.id]))
  const validPhaseIds = new Set(phases.map((p) => p.id))
  const allocations = parsed.data.allocations
    .map((a) => ({ phaseId: a.phaseId, roleConfigId: nameToId.get(a.roleName), percentage: a.percentage }))
    .filter(
      (a): a is { phaseId: string; roleConfigId: string; percentage: number } =>
        a.roleConfigId !== undefined && validPhaseIds.has(a.phaseId)
    )

  return { allocations, rationale: parsed.data.rationale, assumptions: parsed.data.assumptions }
}
