import type { ProposalData } from '@/lib/documents/proposal-data'
import type { ProposalStructuredContent, ProposalNarrative } from '@/types'
import { DEFAULT_ROADMAP_BG } from '@/lib/roadmap-style'

/**
 * A zeroed DocData backdrop for previewing a deck template (which has no real
 * opportunity behind it). Data-bound slides (scope, team, plan, risk) render their
 * placeholder states — they fill with real numbers per opportunity at generation.
 */
function blankDocData() {
  return {
    estimation: {
      opportunity: { id: 'template', name: 'Sample opportunity', currency: 'EUR', customerName: 'Sample customer' },
      roleConfigs: [],
      rollouts: [],
      background: DEFAULT_ROADMAP_BG,
      groups: [],
      goLiveOffsets: {},
    },
    summary: {
      phases: [],
      roles: [],
      projectTotalDays: 0,
      projectTotalCost: 0,
      averageUtilisation: 0,
      durationMonths: 0,
      currency: 'EUR',
    },
    scope: {
      modules: {},
      phases: [],
      selectedModuleNames: [],
      requirements: [],
      assumptions: [],
      exclusions: [],
      deferred: [],
      risks: [],
    },
  }
}

/** Build a full ProposalData for the deck-template preview from the editable layer. */
export function buildTemplatePreviewData(args: {
  content: ProposalStructuredContent
  narrative: ProposalNarrative
  companyName: string | null | undefined
  footerText: string | null | undefined
  sectionSelection: Record<string, boolean>
}): ProposalData {
  return {
    ...blankDocData(),
    meta: {
      opportunityName: 'Sample opportunity',
      customerName: 'Sample customer',
      customerIndustry: 'Manufacturing',
      customerCountry: 'Finland',
    },
    content: args.content,
    narrative: args.narrative,
    branding: {
      companyName: args.companyName || 'Arcwide',
      footerText: args.footerText || 'ARCWIDE · IFS CLOUD IMPLEMENTATION PROPOSAL',
      defaultCurrency: 'EUR',
    },
    sectionSelection: args.sectionSelection,
  }
}
