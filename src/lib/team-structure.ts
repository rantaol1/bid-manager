import { TEAM_STRUCTURE } from '@/lib/documents/slides/static-content'
import type { OrgArea, OrgSide, OrgTeam, TeamStructureContent } from '@/types'

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function normalizeArea(v: unknown): OrgArea {
  const a = (v ?? {}) as Partial<OrgArea>
  return {
    label: asString(a.label),
    children: Array.isArray(a.children) ? a.children.filter((x): x is string => typeof x === 'string') : [],
  }
}

function normalizeTeam(v: unknown): OrgTeam {
  const t = (v ?? {}) as Partial<OrgTeam>
  return {
    title: asString(t.title),
    lead: typeof t.lead === 'string' ? t.lead : undefined,
    areas: Array.isArray(t.areas) ? t.areas.map(normalizeArea) : [],
    // Treat a missing flag as enabled so legacy rows still render.
    enabled: t.enabled !== false,
  }
}

function normalizeSide(v: unknown, fallback: OrgSide): OrgSide {
  if (!v || typeof v !== 'object') return fallback
  const s = v as Partial<OrgSide>
  return {
    projectManager: asString(s.projectManager, fallback.projectManager),
    teams: Array.isArray(s.teams) ? s.teams.map(normalizeTeam) : fallback.teams,
  }
}

/**
 * Coerce stored team-structure JSON into the current shape. Team structure is read
 * as raw JSON (not Zod-validated on read), so this heals partial/legacy rows and
 * falls back to the builtin default when nothing usable is present. Mirrors
 * `normalizeGovernance` in `@/lib/governance`.
 */
export function normalizeTeamStructure(value: unknown): TeamStructureContent {
  if (!value || typeof value !== 'object') return TEAM_STRUCTURE
  const v = value as Partial<TeamStructureContent>
  return {
    steeringLabel: asString(v.steeringLabel, TEAM_STRUCTURE.steeringLabel),
    designAuthorityLabel: asString(v.designAuthorityLabel, TEAM_STRUCTURE.designAuthorityLabel),
    changeManagementLabel: asString(v.changeManagementLabel, TEAM_STRUCTURE.changeManagementLabel),
    partner: normalizeSide(v.partner, TEAM_STRUCTURE.partner),
    customer: normalizeSide(v.customer, TEAM_STRUCTURE.customer),
  }
}
