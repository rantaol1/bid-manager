import { prisma } from '@/lib/prisma'
import { loadEstimation, type LoadedEstimation } from '@/lib/estimation-data'
import { computeEstimation } from '@/lib/estimation'
import type { EstimationSummary, ScopeModules, ScopeRequirement, ScopeRisk, ScopePhase } from '@/types'
import { IFS_MODULES, SCOPE_PHASES_DEFAULT } from '@/lib/constants/ifs-modules'

export interface DocScope {
  modules: ScopeModules
  phases: ScopePhase[]
  selectedModuleNames: string[]
  requirements: ScopeRequirement[]
  assumptions: string[]
  exclusions: string[]
  deferred: string[]
  risks: ScopeRisk[]
}

export interface DocData {
  estimation: LoadedEstimation
  summary: EstimationSummary
  scope: DocScope
}

export async function loadDocData(opportunityId: string): Promise<DocData | null> {
  const estimation = await loadEstimation(opportunityId)
  if (!estimation) return null

  const summary = computeEstimation({
    roleConfigs: estimation.roleConfigs,
    rollouts: estimation.rollouts,
    currency: estimation.opportunity.currency,
  })

  const scopeRow = await prisma.scope.findUnique({ where: { opportunityId } })
  const modules = (scopeRow?.modules as ScopeModules) ?? {}
  const phasesRaw = (scopeRow?.scopePhases as unknown as ScopePhase[]) ?? []
  const phases = phasesRaw.length > 0 ? phasesRaw : SCOPE_PHASES_DEFAULT
  const requirements = (scopeRow?.requirements as unknown as ScopeRequirement[]) ?? []
  const risks = (scopeRow?.risks as unknown as ScopeRisk[]) ?? []
  const selectedModuleNames = IFS_MODULES.filter((m) => modules[m.id]?.selected).map((m) => m.name)

  return {
    estimation,
    summary,
    scope: {
      modules,
      phases,
      selectedModuleNames,
      requirements,
      assumptions: scopeRow?.assumptions ?? [],
      exclusions: scopeRow?.exclusions ?? [],
      deferred: scopeRow?.deferred ?? [],
      risks,
    },
  }
}
