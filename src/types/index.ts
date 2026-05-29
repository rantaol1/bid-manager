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
