import { applyGovTokens } from '@/lib/governance'
import type { OrgSide, TeamStructureContent } from '@/types'
import { BRAND } from './branding'

/**
 * Pure geometry for the project-organisation org chart. Both the pptxgenjs builder
 * (`teamStructureSlide`) and the React preview (`TeamStructure`) consume this so the
 * two renderings stay numerically identical. All units are inches on the 10 x 5.625
 * canvas; the slide title/footer chrome is added by the callers.
 */

export type OrgBoxKind = 'plain' | 'team' | 'arrow'

export interface OrgRow {
  text: string
  bold: boolean
  /** 0 = area heading, 1 = nested child. */
  indent: number
}

export interface OrgBox {
  kind: OrgBoxKind
  x: number
  y: number
  w: number
  h: number
  /** Box / header fill (hex, no '#'). */
  fill: string
  /** Centred label for 'plain' / 'arrow' boxes, or the header text for 'team' boxes. */
  label: string
  /** Header band height for 'team' boxes. */
  headerH?: number
  /** Body rows for 'team' boxes. */
  rows?: OrgRow[]
}

export interface OrgConnector {
  x1: number
  y1: number
  x2: number
  y2: number
  arrow: 'none' | 'end' | 'both'
}

export interface OrgLayout {
  boxes: OrgBox[]
  connectors: OrgConnector[]
}

const TOK_FN = applyGovTokens

// Vertical bands
const STEER_Y = 1.42
const TOP_H = 0.4
const PM_Y = 2.0
const STEER_BUS_Y = 1.9
const PM_BUS_Y = 2.5
const TEAMS_TOP = 2.66
const TEAMS_BOTTOM = 4.72
const HEADER_H = 0.3

// Horizontal grid (4 team columns across the 0.5..9.5 content band)
const LEFT = 0.5
const RIGHT = 9.5
const GAP = 0.16
const COL_W = (RIGHT - LEFT - 3 * GAP) / 4
const colX = (i: number) => LEFT + i * (COL_W + GAP)
const colCenter = (i: number) => colX(i) + COL_W / 2

function teamRows(team: OrgSide['teams'][number], tok: { customer: string; partner: string }): OrgRow[] {
  const rows: OrgRow[] = []
  if (team.lead) rows.push({ text: TOK_FN(team.lead, tok), bold: true, indent: 0 })
  for (const area of team.areas) {
    rows.push({ text: TOK_FN(area.label, tok), bold: true, indent: 0 })
    for (const child of area.children) rows.push({ text: TOK_FN(child, tok), bold: false, indent: 1 })
  }
  return rows
}

/**
 * Build the full set of boxes + connectors. Disabled teams are dropped, and the
 * columns re-flow so partner-only / customer-only engagements stay balanced.
 */
export function computeOrgLayout(ts: TeamStructureContent, tok: { customer: string; partner: string }): OrgLayout {
  const boxes: OrgBox[] = []
  const connectors: OrgConnector[] = []

  const partnerTeams = ts.partner.teams.filter((t) => t.enabled)
  const customerTeams = ts.customer.teams.filter((t) => t.enabled)
  const hasPartner = partnerTeams.length > 0
  const hasCustomer = customerTeams.length > 0

  // Assign columns left→right: partner teams then customer teams (max 4).
  const cols: Array<{ side: 'partner' | 'customer'; team: OrgSide['teams'][number] }> = [
    ...partnerTeams.map((team) => ({ side: 'partner' as const, team })),
    ...customerTeams.map((team) => ({ side: 'customer' as const, team })),
  ].slice(0, 4)

  const partnerColIdx = cols.map((c, i) => (c.side === 'partner' ? i : -1)).filter((i) => i >= 0)
  const customerColIdx = cols.map((c, i) => (c.side === 'customer' ? i : -1)).filter((i) => i >= 0)

  // --- Steering + Design Authority (top row) ---
  const steerW = 2.2
  const steerX = (10 - steerW) / 2
  boxes.push({ kind: 'plain', x: steerX, y: STEER_Y, w: steerW, h: TOP_H, fill: BRAND.magenta, label: ts.steeringLabel })

  const daW = 1.7
  const daX = RIGHT - daW
  boxes.push({ kind: 'plain', x: daX, y: STEER_Y, w: daW, h: TOP_H, fill: BRAND.purple, label: ts.designAuthorityLabel })
  // Design Authority feeds into the Steering Group (arrow points left into Steering).
  connectors.push({ x1: daX, y1: STEER_Y + TOP_H / 2, x2: steerX + steerW, y2: STEER_Y + TOP_H / 2, arrow: 'end' })

  // --- Project Manager boxes, centred over each side's columns ---
  const pmW = 2.3
  const pmCenter = (idx: number[]) => (idx.length ? (colCenter(idx[0]) + colCenter(idx[idx.length - 1])) / 2 : 5)
  const partnerPMx = pmCenter(partnerColIdx) - pmW / 2
  const customerPMx = pmCenter(customerColIdx) - pmW / 2

  if (hasPartner) {
    boxes.push({ kind: 'plain', x: partnerPMx, y: PM_Y, w: pmW, h: TOP_H, fill: BRAND.magenta, label: TOK_FN(ts.partner.projectManager, tok) })
  }
  if (hasCustomer) {
    boxes.push({ kind: 'plain', x: customerPMx, y: PM_Y, w: pmW, h: TOP_H, fill: BRAND.purple, label: TOK_FN(ts.customer.projectManager, tok) })
  }

  // --- Steering → PM bus ---
  const pCx = partnerPMx + pmW / 2
  const cCx = customerPMx + pmW / 2
  const busL = hasPartner ? pCx : cCx
  const busR = hasCustomer ? cCx : pCx
  connectors.push({ x1: 5, y1: STEER_Y + TOP_H, x2: 5, y2: STEER_BUS_Y, arrow: 'none' })
  connectors.push({ x1: Math.min(busL, 5), y1: STEER_BUS_Y, x2: Math.max(busR, 5), y2: STEER_BUS_Y, arrow: 'none' })
  if (hasPartner) connectors.push({ x1: pCx, y1: STEER_BUS_Y, x2: pCx, y2: PM_Y, arrow: 'none' })
  if (hasCustomer) connectors.push({ x1: cCx, y1: STEER_BUS_Y, x2: cCx, y2: PM_Y, arrow: 'none' })
  // Bidirectional PM ↔ PM link.
  if (hasPartner && hasCustomer) {
    connectors.push({ x1: partnerPMx + pmW, y1: PM_Y + TOP_H / 2, x2: customerPMx, y2: PM_Y + TOP_H / 2, arrow: 'both' })
  }

  // --- PM → team bus (one per side) ---
  const sideBus = (idx: number[], pmCx: number) => {
    if (!idx.length) return
    const l = colCenter(idx[0])
    const r = colCenter(idx[idx.length - 1])
    connectors.push({ x1: pmCx, y1: PM_Y + TOP_H, x2: pmCx, y2: PM_BUS_Y, arrow: 'none' })
    connectors.push({ x1: Math.min(l, pmCx), y1: PM_BUS_Y, x2: Math.max(r, pmCx), y2: PM_BUS_Y, arrow: 'none' })
    for (const i of idx) connectors.push({ x1: colCenter(i), y1: TEAMS_TOP, x2: colCenter(i), y2: PM_BUS_Y, arrow: 'end' })
  }
  if (hasPartner) sideBus(partnerColIdx, pCx)
  if (hasCustomer) sideBus(customerColIdx, cCx)

  // --- Team boxes ---
  cols.forEach((c, i) => {
    const fill = c.side === 'partner' ? BRAND.magenta : BRAND.purple
    boxes.push({
      kind: 'team',
      x: colX(i),
      y: TEAMS_TOP,
      w: COL_W,
      h: TEAMS_BOTTOM - TEAMS_TOP,
      fill,
      label: TOK_FN(c.team.title, tok),
      headerH: HEADER_H,
      rows: teamRows(c.team, tok),
    })
  })

  // --- Change Management double-arrow across the customer side ---
  if (hasCustomer && ts.changeManagementLabel.trim()) {
    const l = colX(customerColIdx[0])
    const r = colX(customerColIdx[customerColIdx.length - 1]) + COL_W
    boxes.push({ kind: 'arrow', x: l, y: TEAMS_BOTTOM + 0.12, w: r - l, h: 0.26, fill: BRAND.purple, label: TOK_FN(ts.changeManagementLabel, tok) })
  }

  return { boxes, connectors }
}
