import type { StageId } from '@/lib/constants/stages'

export type { StageId }
export type Role = 'admin' | 'bid_manager' | 'contributor'

/** Authenticated user as returned by getCurrentUser(). */
export interface AppUser {
  id: string
  name: string
  email: string | null
  role: string
  imageUrl: string
}

/* ---------- Scope (stored as JSON on the Scope model) ---------- */

export type FitGap = 'fit' | 'partial' | 'gap'

/** A delivery phase in the scope solution map (legend entry). */
export interface ScopePhase {
  id: string
  label: string
  colour: string
}

/**
 * Map of solution-map tile id -> selection state. Stored in Scope.modules.
 * `phaseId` links the tile to a ScopePhase, indicating the phase it is taken
 * into use; it is set whenever `selected` is true.
 */
export type ScopeModules = Record<
  string,
  { selected: boolean; fitGap?: FitGap; notes?: string; phaseId?: string }
>

export interface ScopeRequirement {
  id: string
  title: string
  moduleId?: string
  description?: string
  priority: 'must' | 'should' | 'could' | 'wont'
  fitGap: FitGap
}

export interface ScopeRisk {
  id: string
  title: string
  description?: string
  likelihood: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation?: string
}

/* ---------- Estimation derived calculations ---------- */

export interface PhaseCalc {
  phaseId: string
  phaseName: string
  rolloutId: string
  rolloutName: string
  workingDays: number
  totalDays: number
  /** Fees: bill rate × days. */
  totalCost: number
  /** Internal delivery cost: cost rate × days. */
  totalInternalCost: number
}

export interface RoleCalc {
  roleConfigId: string
  roleName: string
  /** Bill (charge-out) rate per day. */
  rate: number
  /** Internal cost rate per day. */
  costRate: number
  totalDays: number
  /** Fees: bill rate × days. */
  totalCost: number
  /** Internal delivery cost: cost rate × days. */
  totalInternalCost: number
}

export interface EstimationSummary {
  phases: PhaseCalc[]
  roles: RoleCalc[]
  projectTotalDays: number
  /** Total fees (bill-rate revenue): Σ bill rate × days. */
  projectTotalCost: number
  /** Total internal delivery cost: Σ cost rate × days. */
  projectInternalCost: number
  /** Gross margin in currency: projectTotalCost − projectInternalCost. */
  projectMargin: number
  /** Gross margin as a fraction of fees (0..1); 0 when there are no fees. */
  projectMarginPct: number
  averageUtilisation: number
  durationMonths: number
  currency: string
}

/* ---------- Project performance analysis (lib/analysis.ts) ---------- */

/** One month of the staffing/resource histogram. */
export interface StaffingBucket {
  /** Calendar month, 'YYYY-MM'. */
  month: string
  /** Person-days of effort landing in this month (across overlapping phases). */
  personDays: number
  /** Average concurrent headcount this month = personDays ÷ working days in month. */
  fte: number
}

/** A slice of the cost (fees) mix, by role or by workstream. */
export interface MixSlice {
  id: string
  name: string
  /** Fees attributable to this slice. */
  cost: number
  days: number
  /** Share of total fees (0..1); 0 when total fees is 0. */
  share: number
  /** Display colour (rollouts carry their own; roles are assigned from a palette). */
  colour?: string
}

/** Derived project-performance KPIs for the Analysis tab. Built on EstimationSummary. */
export interface AnalysisSummary {
  currency: string

  // Commercial — margin is intrinsic to the rate card (fees − delivery cost).
  fees: number
  deliveryCost: number
  grossMargin: number
  /** Gross margin as a fraction of fees (0..1); 0 when there are no fees. */
  grossMarginPct: number
  blendedBillRate: number
  blendedCostRate: number
  /** Negotiated deal value (expectedValue); null when unset. */
  dealValue: number | null
  probability: number | null
  /** dealValue × probability/100; null if either input is null. */
  weightedValue: number | null
  /** (dealValue − fees) / fees; null when dealValue unset or fees is 0. */
  dealVsFeesVariance: number | null

  // Effort / resourcing
  totalDays: number
  /** Average concurrent headcount across the project span. */
  averageTeamFte: number
  /** Highest monthly FTE from the staffing histogram. */
  peakFte: number
  averageUtilisation: number
  roleCount: number
  costMixByRole: MixSlice[]
  costMixByRollout: MixSlice[]

  // Schedule (derived from phase dates, not the sales close date)
  durationMonths: number
  projectStart: string | null
  projectEnd: string | null
  projectWorkingDays: number
  phaseCount: number
  goLiveCount: number

  // Staffing profile over time
  staffing: StaffingBucket[]
}

/* ---------- Proposal content (ProposalContent / ProposalDefaults models) ---------- */

/** A single RACI role letter. */
export type RaciLetter = 'R' | 'A' | 'C' | 'I'

/** RACI cell value: the set of letters assigned to a role for an activity. A
 * party can hold several (e.g. both Accountable and Responsible → `['A','R']`). */
export type RaciValue = RaciLetter[]

/** A RACI column (role). `id` keys each row's cells; `label` is the display name. */
export interface RaciColumn {
  id: string
  label: string
}

export interface RaciRow {
  activity: string
  /** letters per column id */
  cells: Record<string, RaciValue>
}

/** RACI matrix with user-editable columns and rows. */
export interface RaciMatrix {
  columns: RaciColumn[]
  rows: RaciRow[]
}

/** CRIM = Customisation / Report / Integration / Migration item. */
export type CrimType = 'C' | 'R' | 'I' | 'M'

export interface CrimItem {
  id: string
  type: CrimType
  name: string
  description?: string
  complexity: 'low' | 'med' | 'high'
}

export interface MethodologyPhase {
  phase: string
  focus: string
  deliverables: string
}

export interface TitledItem {
  title: string
  description: string
}

export interface GovernanceContent {
  steering: string
  pmo: string
  workstreams: string[]
}

export interface ValueDriver {
  driver: string
  ifsCapability: string
  targetOutcome: string
}

export interface ExecutiveSummaryContent {
  opportunity: string
  whatWePropose: string
  howWeDeliver: string
  investment: string
  whyArcwide: string
}

export interface TeamProfile {
  name: string
  role: string
}

export interface ProposalReference {
  name: string
  scope: string
  outcome: string
}

/** Structured content blocks that have global defaults + per-opportunity overrides. */
export interface ProposalStructuredContent {
  raci: RaciMatrix
  crims: CrimItem[]
  methodologyPhases: MethodologyPhase[]
  waysOfWorking: TitledItem[]
  governance: GovernanceContent
  customerCommitments: TitledItem[]
  dataMigrationSteps: string[]
  integrationSteps: string[]
  testingSteps: string[]
  adoptionSteps: string[]
  goLiveSteps: string[]
  whyArcwide: TitledItem[]
}

/** Narrative (manual-entry) proposal fields. */
export interface ProposalNarrative {
  executiveSummary: ExecutiveSummaryContent | null
  understanding: string | null
  valueDrivers: ValueDriver[]
  commercialModel: string | null
  recommendation: string | null
  teamProfiles: TeamProfile[]
  references: ProposalReference[]
  contactName: string | null
  contactTitle: string | null
  contactEmail: string | null
  contactPhone: string | null
}

/* ---------- Timeline (stored as JSON on Opportunity.timelineConfig) ---------- */

export interface TimelineGroup {
  id: string
  label: string
  colour: string
  phaseIds: string[] // phases this group spans (group bracket = min start → max end)
  offsetY?: number // vertical px offset of the band from its default stacked position
}

export interface TimelineConfig {
  pxPerMonth?: number
  lanes?: Record<string, number> // rolloutId -> lane index
  groups?: TimelineGroup[] // editable bracket annotations grouping arbitrary phases
  background?: string // roadmap card background colour (#RRGGBB)
  // Per-go-live vertical offset (px from its lane centre), keyed by `${phaseId}:${yyyy-MM-dd}`.
  goLiveOffsets?: Record<string, number>
}

/* ---------- API helpers ---------- */

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface ListResponse<T> {
  data: T[]
  pagination?: Pagination
}
