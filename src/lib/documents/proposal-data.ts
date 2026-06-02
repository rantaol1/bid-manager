import { prisma } from '@/lib/prisma'
import { loadDocData, type DocData } from '@/lib/documents/doc-data'
import { BUILTIN_STRUCTURED_CONTENT } from '@/lib/documents/slides/static-content'
import type {
  ProposalStructuredContent,
  ProposalNarrative,
  ExecutiveSummaryContent,
  ValueDriver,
  TeamProfile,
  ProposalReference,
} from '@/types'

export interface ProposalMeta {
  opportunityName: string
  customerName: string
  customerIndustry: string | null
  customerCountry: string | null
}

export interface ProposalData extends DocData {
  meta: ProposalMeta
  content: ProposalStructuredContent
  narrative: ProposalNarrative
}

/** Pick the first non-null/non-undefined value: override ?? default ?? builtin. */
function resolve<K extends keyof ProposalStructuredContent>(
  key: K,
  override: unknown,
  defaults: Record<string, unknown> | null
): ProposalStructuredContent[K] {
  if (override !== null && override !== undefined) {
    return override as ProposalStructuredContent[K]
  }
  const fromDefaults = defaults?.[key as string]
  if (fromDefaults !== null && fromDefaults !== undefined) {
    return fromDefaults as ProposalStructuredContent[K]
  }
  return BUILTIN_STRUCTURED_CONTENT[key]
}

/** Resolve the full structured content for an opportunity (override ?? default ?? builtin). */
export async function resolveStructuredContent(
  override: Record<string, unknown> | null,
  defaultsRow: Record<string, unknown> | null
): Promise<ProposalStructuredContent> {
  const o = override ?? {}
  const d = defaultsRow
  return {
    raci: resolve('raci', o.raci, d),
    crims: resolve('crims', o.crims, d),
    methodologyPhases: resolve('methodologyPhases', o.methodologyPhases, d),
    waysOfWorking: resolve('waysOfWorking', o.waysOfWorking, d),
    governance: resolve('governance', o.governance, d),
    customerCommitments: resolve('customerCommitments', o.customerCommitments, d),
    dataMigrationSteps: resolve('dataMigrationSteps', o.dataMigrationSteps, d),
    integrationSteps: resolve('integrationSteps', o.integrationSteps, d),
    testingSteps: resolve('testingSteps', o.testingSteps, d),
    adoptionSteps: resolve('adoptionSteps', o.adoptionSteps, d),
    goLiveSteps: resolve('goLiveSteps', o.goLiveSteps, d),
    whyArcwide: resolve('whyArcwide', o.whyArcwide, d),
  }
}

function toNarrative(row: Record<string, unknown> | null): ProposalNarrative {
  const r = row ?? {}
  return {
    executiveSummary: (r.executiveSummary as ExecutiveSummaryContent) ?? null,
    understanding: (r.understanding as string) ?? null,
    valueDrivers: (r.valueDrivers as ValueDriver[]) ?? [],
    commercialModel: (r.commercialModel as string) ?? null,
    recommendation: (r.recommendation as string) ?? null,
    teamProfiles: (r.teamProfiles as TeamProfile[]) ?? [],
    references: (r.references as ProposalReference[]) ?? [],
    contactName: (r.contactName as string) ?? null,
    contactTitle: (r.contactTitle as string) ?? null,
    contactEmail: (r.contactEmail as string) ?? null,
    contactPhone: (r.contactPhone as string) ?? null,
  }
}

/** Load everything needed to generate a proposal: estimation, scope, customer meta,
 *  resolved structured content, and narrative fields. */
export async function loadProposalData(opportunityId: string): Promise<ProposalData | null> {
  const docData = await loadDocData(opportunityId)
  if (!docData) return null

  const [opp, contentRow, defaultsRow] = await Promise.all([
    prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { name: true, customer: { select: { name: true, industry: true, country: true } } },
    }),
    prisma.proposalContent.findUnique({ where: { opportunityId } }),
    prisma.proposalDefaults.findUnique({ where: { id: 'singleton' } }),
  ])

  if (!opp) return null

  const content = await resolveStructuredContent(
    contentRow as unknown as Record<string, unknown> | null,
    defaultsRow as unknown as Record<string, unknown> | null
  )

  return {
    ...docData,
    meta: {
      opportunityName: opp.name,
      customerName: opp.customer.name,
      customerIndustry: opp.customer.industry,
      customerCountry: opp.customer.country,
    },
    content,
    narrative: toNarrative(contentRow as unknown as Record<string, unknown> | null),
  }
}
