import { Prisma } from '@prisma/client'
import { getProposalDefaults } from '@/app/api/proposal-defaults/route'
import { defaultSectionSelection, type DeliverableType } from '@/lib/documents/proposal-sections'
import type { DeckVersionContentInput } from '@/lib/schemas/deck-template'

/** Version columns stored as Json (null must be written as Prisma.DbNull). */
const VERSION_JSON_FIELDS = new Set([
  'executiveSummary',
  'valueDrivers',
  'teamProfiles',
  'references',
  'raci',
  'crims',
  'methodologyPhases',
  'waysOfWorking',
  'governance',
  'customerCommitments',
  'dataMigrationSteps',
  'integrationSteps',
  'testingSteps',
  'adoptionSteps',
  'goLiveSteps',
  'whyArcwide',
  'sectionSelection',
])

/** Map a validated version content object into Prisma create/update data,
 *  writing null JSON values as Prisma.DbNull and omitting absent keys. */
export function versionContentToPrismaData(content: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(content)) {
    if (value === undefined) continue
    if (VERSION_JSON_FIELDS.has(key)) {
      data[key] = value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)
    } else {
      data[key] = value // string columns accept null directly
    }
  }
  return data
}

/** Build the content for a fresh Version 1: structured blocks from the workspace
 *  defaults singleton, default section selection, empty narrative/branding. */
export async function buildDefaultVersionContent(kind: DeliverableType): Promise<DeckVersionContentInput> {
  const d = await getProposalDefaults()
  return {
    raci: d.raci as DeckVersionContentInput['raci'],
    crims: d.crims as DeckVersionContentInput['crims'],
    methodologyPhases: d.methodologyPhases as DeckVersionContentInput['methodologyPhases'],
    waysOfWorking: d.waysOfWorking as DeckVersionContentInput['waysOfWorking'],
    governance: d.governance as DeckVersionContentInput['governance'],
    customerCommitments: d.customerCommitments as DeckVersionContentInput['customerCommitments'],
    dataMigrationSteps: d.dataMigrationSteps as DeckVersionContentInput['dataMigrationSteps'],
    integrationSteps: d.integrationSteps as DeckVersionContentInput['integrationSteps'],
    testingSteps: d.testingSteps as DeckVersionContentInput['testingSteps'],
    adoptionSteps: d.adoptionSteps as DeckVersionContentInput['adoptionSteps'],
    goLiveSteps: d.goLiveSteps as DeckVersionContentInput['goLiveSteps'],
    whyArcwide: d.whyArcwide as DeckVersionContentInput['whyArcwide'],
    sectionSelection: defaultSectionSelection(kind),
  }
}
