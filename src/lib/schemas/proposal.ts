import { z } from 'zod'

/* ---------- Structured block schemas ---------- */

const raciValue = z.enum(['R', 'A', 'C', 'I', ''])

const raciRow = z.object({
  activity: z.string().min(1).max(200).trim(),
  execSponsor: raciValue,
  processOwner: raciValue,
  sme: raciValue,
  arcwidePM: raciValue,
  arcwideSA: raciValue,
  arcwideConsultant: raciValue,
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

const governance = z.object({
  steering: z.string().max(800),
  pmo: z.string().max(800),
  workstreams: z.array(z.string().max(120)).max(12),
})

const stepList = z.array(z.string().max(300)).max(12)

/** The structured blocks shared by ProposalContent overrides and ProposalDefaults. */
const structuredBlocks = {
  raci: z.array(raciRow).max(40),
  crims: z.array(crimItem).max(100),
  methodologyPhases: z.array(methodologyPhase).max(12),
  waysOfWorking: z.array(titledItem).max(12),
  governance,
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
  understanding: z.string().max(4000).nullable().optional(),
  valueDrivers: z.array(valueDriver).max(4).nullable().optional(),
  commercialModel: z.string().max(4000).nullable().optional(),
  recommendation: z.string().max(4000).nullable().optional(),
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
  customerCommitments: structuredBlocks.customerCommitments.nullable().optional(),
  dataMigrationSteps: structuredBlocks.dataMigrationSteps.nullable().optional(),
  integrationSteps: structuredBlocks.integrationSteps.nullable().optional(),
  testingSteps: structuredBlocks.testingSteps.nullable().optional(),
  adoptionSteps: structuredBlocks.adoptionSteps.nullable().optional(),
  goLiveSteps: structuredBlocks.goLiveSteps.nullable().optional(),
  whyArcwide: structuredBlocks.whyArcwide.nullable().optional(),
})

/** Global defaults — all structured blocks required (defaults are always complete). */
export const proposalDefaultsSchema = z.object(structuredBlocks)

/** Generation request. */
export const generateProposalSchema = z.object({
  type: z.enum(['full_proposal', 'board_summary']),
  selectedSections: z.array(z.string().min(1)).min(1).max(60),
})

export type ProposalContentInput = z.infer<typeof proposalContentSchema>
export type ProposalDefaultsInput = z.infer<typeof proposalDefaultsSchema>
export type GenerateProposalInput = z.infer<typeof generateProposalSchema>
