import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api'
import { suggestRequestSchema } from '@/lib/schemas/suggest'
import { loadEstimation, type LoadedEstimation } from '@/lib/estimation-data'
import { computeEstimation, type EstRollout } from '@/lib/estimation'
import {
  suggestAllocations,
  selectInScopePhases,
  type ScopeSignals,
} from '@/lib/ai/suggest-allocations'
import { IFS_MODULES } from '@/lib/constants/ifs-modules'

type Params = { params: Promise<{ id: string }> }
type Alloc = { phaseId: string; roleConfigId: string; percentage: number }

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Cost of an allocation set over the in-scope phases, via the shared estimation engine. */
function costOf(allocs: Alloc[], loaded: LoadedEstimation, inScopeIds: Set<string>): number {
  const byPhase = new Map<string, { roleConfigId: string; percentage: number }[]>()
  for (const a of allocs) {
    if (!inScopeIds.has(a.phaseId)) continue
    const arr = byPhase.get(a.phaseId) ?? []
    arr.push({ roleConfigId: a.roleConfigId, percentage: a.percentage })
    byPhase.set(a.phaseId, arr)
  }
  const rollouts: EstRollout[] = loaded.rollouts.map((ro) => ({
    ...ro,
    phases: ro.phases
      .filter((p) => inScopeIds.has(p.id))
      .map((p) => ({ ...p, allocations: byPhase.get(p.id) ?? [] })),
  }))
  return computeEstimation({
    roleConfigs: loaded.roleConfigs,
    rollouts,
    currency: loaded.opportunity.currency,
  }).projectTotalCost
}

function buildScopeSignals(
  scope: { modules: unknown; requirements: unknown; risks: unknown; assumptions: string[] } | null
): ScopeSignals | null {
  if (!scope) return null
  const nameById = new Map(IFS_MODULES.map((m) => [m.id, m.name]))

  const modules =
    scope.modules && typeof scope.modules === 'object'
      ? (scope.modules as Record<string, { selected?: boolean }>)
      : {}
  const moduleNames = Object.entries(modules)
    .filter(([, v]) => v && v.selected)
    .map(([k]) => nameById.get(k) ?? k)

  const requirements = Array.isArray(scope.requirements)
    ? (scope.requirements as { priority?: string; fitGap?: string }[])
    : []
  const requirementsByPriority: Record<string, number> = {}
  const requirementsByFitGap: Record<string, number> = {}
  for (const r of requirements) {
    if (r && typeof r.priority === 'string')
      requirementsByPriority[r.priority] = (requirementsByPriority[r.priority] ?? 0) + 1
    if (r && typeof r.fitGap === 'string')
      requirementsByFitGap[r.fitGap] = (requirementsByFitGap[r.fitGap] ?? 0) + 1
  }

  const risks = Array.isArray(scope.risks) ? (scope.risks as { title?: string }[]) : []
  const riskTitles = risks
    .map((r) => (r && typeof r.title === 'string' ? r.title : ''))
    .filter(Boolean)

  return {
    moduleNames,
    requirementCount: requirements.length,
    requirementsByPriority,
    requirementsByFitGap,
    riskTitles,
    assumptions: Array.isArray(scope.assumptions) ? scope.assumptions : [],
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { targetCost, scope: scopeFilter, guidance } = suggestRequestSchema.parse(body)

    const loaded = await loadEstimation(id)
    if (!loaded) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    if (loaded.roleConfigs.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one role before requesting a suggestion.' },
        { status: 422 }
      )
    }

    const inScope = selectInScopePhases(loaded, scopeFilter)
    if (inScope.length === 0) {
      return NextResponse.json({ error: 'No phases in the selected scope.' }, { status: 422 })
    }

    const scopeRow = await prisma.scope.findUnique({ where: { opportunityId: id } })
    const scopeSignals = buildScopeSignals(scopeRow)

    const suggestion = await suggestAllocations({
      loaded,
      scope: scopeSignals,
      targetCost,
      scopeFilter,
      guidance,
    })

    // Server-side reconciliation: clamp, then a single proportional scale toward the
    // target, then clamp again. Report the honest residual variance.
    const inScopeIds = new Set(inScope.map((p) => p.id))
    let allocs: Alloc[] = suggestion.allocations
      .filter((a) => inScopeIds.has(a.phaseId))
      .map((a) => ({ ...a, percentage: clamp(a.percentage, 0, 100) }))

    const achieved0 = costOf(allocs, loaded, inScopeIds)
    if (achieved0 > 0 && targetCost > 0) {
      const factor = targetCost / achieved0
      allocs = allocs.map((a) => ({ ...a, percentage: clamp(round2(a.percentage * factor), 0, 100) }))
    }
    const achievedCost = costOf(allocs, loaded, inScopeIds)
    const variancePct = targetCost > 0 ? (achievedCost - targetCost) / targetCost : 0

    const scopeLabel =
      scopeFilter.type === 'project'
        ? 'whole project'
        : scopeFilter.type === 'rollout'
          ? `rollout ${inScope[0]?.rolloutName ?? ''}`
          : `phase ${inScope[0]?.phaseName ?? ''}`

    await prisma.activity.create({
      data: {
        opportunityId: id,
        type: 'ai_suggest',
        description: `AI allocation suggestion for ${scopeLabel} (target ${targetCost} ${loaded.opportunity.currency})`,
        metadata: { targetCost, achievedCost, variancePct, scope: scopeFilter },
        createdBy: userId,
      },
    })

    return NextResponse.json({
      data: {
        allocations: allocs,
        rationale: suggestion.rationale,
        assumptions: suggestion.assumptions,
        achievedCost,
        targetCost,
        variancePct,
      },
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/opportunities/[id]/estimation/suggest')
  }
}
