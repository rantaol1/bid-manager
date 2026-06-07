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

/** Map of IFS module id -> selection state. Stored in Scope.modules. */
export type ScopeModules = Record<
  string,
  { selected: boolean; fitGap?: FitGap; notes?: string }
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
  totalCost: number
}

export interface RoleCalc {
  roleConfigId: string
  roleName: string
  rate: number
  totalDays: number
  totalCost: number
}

export interface EstimationSummary {
  phases: PhaseCalc[]
  roles: RoleCalc[]
  projectTotalDays: number
  projectTotalCost: number
  averageUtilisation: number
  durationMonths: number
  currency: string
}

/* ---------- Proposal content (ProposalContent / ProposalDefaults models) ---------- */

/** RACI cell value. */
export type RaciValue = 'R' | 'A' | 'C' | 'I' | ''

/** A RACI column (role). `id` keys each row's cells; `label` is the display name. */
export interface RaciColumn {
  id: string
  label: string
}

export interface RaciRow {
  activity: string
  /** value per column id */
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

export interface TimelineConfig {
  pxPerMonth?: number
  lanes?: Record<string, number> // rolloutId -> lane index
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
