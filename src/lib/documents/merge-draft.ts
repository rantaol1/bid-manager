import type { ProposalData } from '@/lib/documents/proposal-data'
import type { ProposalContentInput } from '@/lib/schemas/proposal'
import type { ProposalStructuredContent } from '@/types'
import { normalizeRaci } from '@/lib/raci'
import { normalizeTeamStructure } from '@/lib/team-structure'

type Draft = Partial<ProposalContentInput>

const STRUCTURED_KEYS: Array<keyof ProposalStructuredContent> = [
  'raci',
  'crims',
  'methodologyPhases',
  'waysOfWorking',
  'governance',
  'teamStructure',
  'customerCommitments',
  'dataMigrationSteps',
  'integrationSteps',
  'testingSteps',
  'adoptionSteps',
  'goLiveSteps',
  'whyArcwide',
]

/**
 * Overlay the live editor draft onto fetched proposal data so previews update as
 * the user types. A draft value of `undefined` (untouched) or `null` (reset to
 * default) keeps the already-resolved fetched value.
 */
export function mergeDraftIntoData(data: ProposalData, draft: Draft | undefined): ProposalData {
  if (!draft) return data

  const content = { ...data.content } as ProposalStructuredContent
  const contentRec = content as unknown as Record<string, unknown>
  for (const key of STRUCTURED_KEYS) {
    const v = (draft as Record<string, unknown>)[key]
    if (v !== undefined && v !== null) {
      contentRec[key] = v
    }
  }
  content.raci = normalizeRaci(content.raci)
  content.teamStructure = normalizeTeamStructure(content.teamStructure)

  const n = data.narrative
  const pick = <T>(v: T | null | undefined, fallback: T): T => (v !== undefined ? (v as T) : fallback)
  const narrative = {
    executiveSummary: pick(draft.executiveSummary ?? undefined, n.executiveSummary),
    understanding: pick(draft.understanding, n.understanding),
    valueDrivers: draft.valueDrivers ?? n.valueDrivers,
    commercialModel: pick(draft.commercialModel, n.commercialModel),
    recommendation: pick(draft.recommendation, n.recommendation),
    teamProfiles: draft.teamProfiles ?? n.teamProfiles,
    references: draft.references ?? n.references,
    contactName: pick(draft.contactName, n.contactName),
    contactTitle: pick(draft.contactTitle, n.contactTitle),
    contactEmail: pick(draft.contactEmail, n.contactEmail),
    contactPhone: pick(draft.contactPhone, n.contactPhone),
  }

  return { ...data, content, narrative }
}
