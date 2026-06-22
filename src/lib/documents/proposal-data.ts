import { prisma } from '@/lib/prisma'
import { loadDocData, type DocData } from '@/lib/documents/doc-data'
import { BUILTIN_STRUCTURED_CONTENT } from '@/lib/documents/slides/static-content'
import { defaultSectionSelection, type DeliverableType } from '@/lib/documents/proposal-sections'
import { normalizeRaci } from '@/lib/raci'
import { normalizeGovernance } from '@/lib/governance'
import { normalizeTeamStructure } from '@/lib/team-structure'
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

export interface ProposalBranding {
  companyName: string
  footerText: string
  defaultCurrency: string
}

export interface ProposalData extends DocData {
  meta: ProposalMeta
  content: ProposalStructuredContent
  narrative: ProposalNarrative
  branding: ProposalBranding
  /** Resolved { sectionId: on } map for the chosen deck version. */
  sectionSelection: Record<string, boolean>
}

/** Pick the first non-null/non-undefined value: override ?? version ?? default ?? builtin. */
function resolve<K extends keyof ProposalStructuredContent>(
  key: K,
  override: unknown,
  version: Record<string, unknown> | null,
  defaults: Record<string, unknown> | null
): ProposalStructuredContent[K] {
  if (override !== null && override !== undefined) {
    return override as ProposalStructuredContent[K]
  }
  const fromVersion = version?.[key as string]
  if (fromVersion !== null && fromVersion !== undefined) {
    return fromVersion as ProposalStructuredContent[K]
  }
  const fromDefaults = defaults?.[key as string]
  if (fromDefaults !== null && fromDefaults !== undefined) {
    return fromDefaults as ProposalStructuredContent[K]
  }
  return BUILTIN_STRUCTURED_CONTENT[key]
}

/** Resolve the full structured content (override ?? template version ?? default ?? builtin). */
export async function resolveStructuredContent(
  override: Record<string, unknown> | null,
  version: Record<string, unknown> | null,
  defaultsRow: Record<string, unknown> | null
): Promise<ProposalStructuredContent> {
  const o = override ?? {}
  const v = version
  const d = defaultsRow
  return {
    raci: normalizeRaci(resolve('raci', o.raci, v, d)),
    crims: resolve('crims', o.crims, v, d),
    methodologyPhases: resolve('methodologyPhases', o.methodologyPhases, v, d),
    waysOfWorking: resolve('waysOfWorking', o.waysOfWorking, v, d),
    governance: normalizeGovernance(resolve('governance', o.governance, v, d)),
    teamStructure: normalizeTeamStructure(resolve('teamStructure', o.teamStructure, v, d)),
    customerCommitments: resolve('customerCommitments', o.customerCommitments, v, d),
    dataMigrationSteps: resolve('dataMigrationSteps', o.dataMigrationSteps, v, d),
    integrationSteps: resolve('integrationSteps', o.integrationSteps, v, d),
    testingSteps: resolve('testingSteps', o.testingSteps, v, d),
    adoptionSteps: resolve('adoptionSteps', o.adoptionSteps, v, d),
    goLiveSteps: resolve('goLiveSteps', o.goLiveSteps, v, d),
    whyArcwide: resolve('whyArcwide', o.whyArcwide, v, d),
  }
}

/** Pick narrative: per-opportunity override ?? template version default ?? empty. */
function pick<T>(override: unknown, version: unknown, fallback: T): T {
  if (override !== null && override !== undefined) return override as T
  if (version !== null && version !== undefined) return version as T
  return fallback
}

function toNarrative(
  row: Record<string, unknown> | null,
  version: Record<string, unknown> | null
): ProposalNarrative {
  const r = row ?? {}
  const v = version ?? {}
  return {
    executiveSummary: pick<ExecutiveSummaryContent | null>(r.executiveSummary, v.executiveSummary, null),
    understanding: pick<string | null>(r.understanding, v.understanding, null),
    valueDrivers: pick<ValueDriver[]>(r.valueDrivers, v.valueDrivers, []),
    commercialModel: pick<string | null>(r.commercialModel, v.commercialModel, null),
    recommendation: pick<string | null>(r.recommendation, v.recommendation, null),
    teamProfiles: pick<TeamProfile[]>(r.teamProfiles, v.teamProfiles, []),
    references: pick<ProposalReference[]>(r.references, v.references, []),
    contactName: pick<string | null>(r.contactName, v.contactName, null),
    contactTitle: pick<string | null>(r.contactTitle, v.contactTitle, null),
    contactEmail: pick<string | null>(r.contactEmail, v.contactEmail, null),
    contactPhone: pick<string | null>(r.contactPhone, v.contactPhone, null),
  }
}

/** Resolve the deck-template version that applies to an opportunity for a given kind:
 *  the per-opportunity selection, else the workspace-default deck's default version. */
export async function resolveDeckVersion(
  opportunityId: string,
  type: DeliverableType,
  contentRow?: { fullDeckVersionId: string | null; boardDeckVersionId: string | null } | null
) {
  const row =
    contentRow ??
    (await prisma.proposalContent.findUnique({
      where: { opportunityId },
      select: { fullDeckVersionId: true, boardDeckVersionId: true },
    }))

  const selectedId = type === 'board_summary' ? row?.boardDeckVersionId : row?.fullDeckVersionId
  if (selectedId) {
    const v = await prisma.deckTemplateVersion.findUnique({ where: { id: selectedId } })
    if (v) return v
  }

  const fallback = await prisma.deckTemplate.findFirst({
    where: { isWorkspaceDefault: true, kind: type },
    orderBy: { createdAt: 'asc' },
    select: { defaultVersion: true },
  })
  return fallback?.defaultVersion ?? null
}

/** Load everything needed to generate a proposal: estimation, scope, customer meta,
 *  resolved structured content, narrative, branding, and the chosen deck's section selection. */
export async function loadProposalData(
  opportunityId: string,
  type: DeliverableType = 'full_proposal'
): Promise<ProposalData | null> {
  const docData = await loadDocData(opportunityId)
  if (!docData) return null

  const [opp, contentRow, defaultsRow, brandingRow] = await Promise.all([
    prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { name: true, customer: { select: { name: true, industry: true, country: true } } },
    }),
    prisma.proposalContent.findUnique({ where: { opportunityId } }),
    prisma.proposalDefaults.findUnique({ where: { id: 'singleton' } }),
    prisma.brandingSettings.findUnique({ where: { id: 'singleton' } }),
  ])

  if (!opp) return null

  const versionRow = await resolveDeckVersion(opportunityId, type, contentRow)
  const version = versionRow as unknown as Record<string, unknown> | null

  const content = await resolveStructuredContent(
    contentRow as unknown as Record<string, unknown> | null,
    version,
    defaultsRow as unknown as Record<string, unknown> | null
  )

  const sectionSelection =
    (version?.sectionSelection as Record<string, boolean> | undefined) ?? defaultSectionSelection(type)

  return {
    ...docData,
    meta: {
      opportunityName: opp.name,
      customerName: opp.customer.name,
      customerIndustry: opp.customer.industry,
      customerCountry: opp.customer.country,
    },
    content,
    narrative: toNarrative(contentRow as unknown as Record<string, unknown> | null, version),
    branding: {
      companyName: (version?.companyName as string) ?? brandingRow?.companyName ?? 'Arcwide',
      footerText:
        (version?.footerText as string) ??
        brandingRow?.footerText ??
        'ARCWIDE · IFS CLOUD IMPLEMENTATION PROPOSAL',
      defaultCurrency: brandingRow?.defaultCurrency ?? 'EUR',
    },
    sectionSelection,
  }
}
