import { z } from 'zod'
import { parseRaciCell } from '@/lib/raci'

/* ---------- Structured block schemas ---------- */

// A cell holds a set of RACI letters. Legacy single-letter strings ('A', '') and
// combined strings ('A/R') are coerced to canonical letter arrays.
const raciCell = z.preprocess((v) => parseRaciCell(v), z.array(z.enum(['R', 'A', 'C', 'I'])).max(4))

const raciMatrix = z.object({
  columns: z.array(z.object({ id: z.string().min(1).max(60), label: z.string().min(1).max(60).trim() })).max(12),
  rows: z
    .array(
      z.object({
        activity: z.string().min(1).max(200).trim(),
        cells: z.record(z.string(), raciCell),
      })
    )
    .max(60),
})

const crimItem = z.object({
  id: z.string().min(1),
  type: z.enum(['C', 'R', 'I', 'M']),
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  complexity: z.enum(['low', 'med', 'high']),
})

const methodologyPhase = z.object({
  phase: z.string().min(1).max(120).trim(),
  focus: z.string().max(500),
  deliverables: z.string().max(500),
})

const titledItem = z.object({
  title: z.string().min(1).max(160).trim(),
  description: z.string().max(600),
})

const governanceBody = z.object({
  name: z.string().max(120).trim(),
  cadence: z.string().max(60).trim(),
  icon: z.enum(['clipboard', 'gauge', 'pin']),
  customerParticipants: z.array(z.string().max(160)).max(8),
  partnerParticipants: z.array(z.string().max(160)).max(8),
  responsibilities: z.array(z.string().max(300)).max(8),
})

const governance = z.object({
  bodies: z.array(governanceBody).max(6),
})

const orgArea = z.object({
  label: z.string().max(120).trim(),
  children: z.array(z.string().max(120)).max(12),
})

const orgTeam = z.object({
  title: z.string().max(120).trim(),
  lead: z.string().max(160).trim().optional(),
  areas: z.array(orgArea).max(12),
  enabled: z.boolean(),
})

const orgSide = z.object({
  projectManager: z.string().max(160).trim(),
  teams: z.array(orgTeam).max(4),
})

const teamStructure = z.object({
  steeringLabel: z.string().max(120).trim(),
  designAuthorityLabel: z.string().max(120).trim(),
  changeManagementLabel: z.string().max(120).trim(),
  partner: orgSide,
  customer: orgSide,
})

const stepList = z.array(z.string().max(300)).max(12)

/** The structured blocks shared by ProposalContent overrides and ProposalDefaults. */
const structuredBlocks = {
  raci: raciMatrix,
  crims: z.array(crimItem).max(100),
  methodologyPhases: z.array(methodologyPhase).max(12),
  waysOfWorking: z.array(titledItem).max(12),
  governance,
  teamStructure,
  customerCommitments: z.array(titledItem).max(12),
  dataMigrationSteps: stepList,
  integrationSteps: stepList,
  testingSteps: stepList,
  adoptionSteps: stepList,
  goLiveSteps: stepList,
  whyArcwide: z.array(titledItem).max(8),
}

/* ---------- Narrative block schemas ---------- */

const executiveSummary = z.object({
  opportunity: z.string().max(2000),
  whatWePropose: z.string().max(2000),
  howWeDeliver: z.string().max(2000),
  investment: z.string().max(2000),
  whyArcwide: z.string().max(2000),
})

const valueDriver = z.object({
  driver: z.string().max(300),
  ifsCapability: z.string().max(300),
  targetOutcome: z.string().max(300),
})

const teamProfile = z.object({
  name: z.string().max(120),
  role: z.string().max(160),
})

const reference = z.object({
  name: z.string().max(160),
  scope: z.string().max(400),
  outcome: z.string().max(400),
})

/* ---------- Public schemas ---------- */

/** Per-opportunity content. Everything optional (partial save); structured blocks
 *  may be null to mean "use the global default". */
export const proposalContentSchema = z.object({
  // narrative
  executiveSummary: executiveSummary.nullable().optional(),
  // Rich-text (HTML) fields — larger cap than plain text to allow markup.
  understanding: z.string().max(20000).nullable().optional(),
  valueDrivers: z.array(valueDriver).max(4).nullable().optional(),
  commercialModel: z.string().max(20000).nullable().optional(),
  recommendation: z.string().max(20000).nullable().optional(),
  teamProfiles: z.array(teamProfile).max(6).nullable().optional(),
  references: z.array(reference).max(3).nullable().optional(),
  contactName: z.string().max(120).nullable().optional(),
  contactTitle: z.string().max(160).nullable().optional(),
  contactEmail: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(60).nullable().optional(),
  // structured overrides (null => use default)
  raci: structuredBlocks.raci.nullable().optional(),
  crims: structuredBlocks.crims.nullable().optional(),
  methodologyPhases: structuredBlocks.methodologyPhases.nullable().optional(),
  waysOfWorking: structuredBlocks.waysOfWorking.nullable().optional(),
  governance: structuredBlocks.governance.nullable().optional(),
  teamStructure: structuredBlocks.teamStructure.nullable().optional(),
  customerCommitments: structuredBlocks.customerCommitments.nullable().optional(),
  dataMigrationSteps: structuredBlocks.dataMigrationSteps.nullable().optional(),
  integrationSteps: structuredBlocks.integrationSteps.nullable().optional(),
  testingSteps: structuredBlocks.testingSteps.nullable().optional(),
  adoptionSteps: structuredBlocks.adoptionSteps.nullable().optional(),
  goLiveSteps: structuredBlocks.goLiveSteps.nullable().optional(),
  whyArcwide: structuredBlocks.whyArcwide.nullable().optional(),
  // Chosen deck-template version per output kind (null => workspace default deck).
  fullDeckVersionId: z.string().min(1).nullable().optional(),
  boardDeckVersionId: z.string().min(1).nullable().optional(),
})

/** Global defaults — structured blocks are complete, except `teamStructure` which is
 *  nullable/optional so the column can be added to pre-existing rows without a
 *  destructive migration (the resolve cascade falls back to the built-in default). */
export const proposalDefaultsSchema = z.object({
  ...structuredBlocks,
  teamStructure: structuredBlocks.teamStructure.nullable().optional(),
})

/** Generation request. When `selectedSections` is omitted, the chosen deck
 *  version's section selection is used. `pptxTemplateId`: a string selects that
 *  .potx template (replace mode); `null` forces the built-in design; omitted keeps
 *  the legacy behaviour (use the active .potx template if one exists). */
export const generateProposalSchema = z.object({
  type: z.enum(['full_proposal', 'board_summary']),
  selectedSections: z.array(z.string().min(1)).min(1).max(60).optional(),
  pptxTemplateId: z.string().min(1).nullable().optional(),
})

export type ProposalContentInput = z.infer<typeof proposalContentSchema>
export type ProposalDefaultsInput = z.infer<typeof proposalDefaultsSchema>
export type GenerateProposalInput = z.infer<typeof generateProposalSchema>
