'use client'

import { inch } from './slide-canvas'
import {
  FUNCTIONAL_GROUPS,
  TECHNICAL_SECTIONS,
  PLATFORM_TILES,
  IFS_AI_FOUNDATION,
  DEPLOYMENT_LABEL,
  type ScopeTile,
} from '@/lib/constants/ifs-modules'
import type { ScopeModules, ScopePhase } from '@/types'

/**
 * HTML preview of the Scope solution tower, mirroring the layout maths of
 * `drawSolutionTower` (the PPTX renderer) so the slide preview matches the
 * generated PowerPoint exactly. Read-only.
 */

const PANEL = '#231047'
const DEPLOY_BAR = '#160F33'
const HEADER_CYAN = '#4FD0E3'
const UNSET = '#FFFFFF'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface TowerScope {
  modules: ScopeModules
  phases: ScopePhase[]
}

function readableText(fill: string): string {
  const h = fill.replace('#', '')
  if (h.length !== 6) return '#1A1A1A'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1A1A1A' : '#FFFFFF'
}

export function PreviewTower({ scope, box }: { scope: TowerScope; box: Box }) {
  const phaseColour = new Map(scope.phases.map((p) => [p.id, p.colour]))
  const fillFor = (tileId: string): string => {
    const m = scope.modules[tileId]
    if (m?.selected && m.phaseId && phaseColour.has(m.phaseId)) return phaseColour.get(m.phaseId) as string
    return UNSET
  }

  const nodes: React.ReactNode[] = []
  let k = 0
  const abs = (x: number, y: number, w: number, h: number, style: React.CSSProperties, children?: React.ReactNode) =>
    nodes.push(
      <div key={k++} style={{ position: 'absolute', left: inch(x), top: inch(y), width: inch(w), height: inch(h), ...style }}>
        {children}
      </div>
    )

  const tileStyle = (fill: string, fontSize: number, bold = false): React.CSSProperties => ({
    backgroundColor: fill,
    color: readableText(fill),
    border: fill === UNSET ? '0.5px solid #D7D2E6' : 'none',
    borderRadius: 3,
    boxShadow: '0 1px 1.5px rgba(0,0,0,0.22)',
    fontSize,
    fontWeight: bold ? 700 : 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 1.05,
    overflow: 'hidden',
    padding: '0 2px',
  })
  const tile = (x: number, y: number, w: number, h: number, name: string, fill: string, fontSize: number, bold = false) =>
    abs(x, y, w, h, tileStyle(fill, fontSize, bold), name)

  // Panel
  abs(box.x, box.y, box.w, box.h, { backgroundColor: PANEL, borderRadius: 6 })

  const pad = 0.12
  const innerX = box.x + pad
  const innerY = box.y + pad
  const innerW = box.w - 2 * pad
  const innerH = box.h - 2 * pad

  /* Legend */
  const legendH = 0.36
  const sw = 0.2
  let lx = innerX
  for (const p of scope.phases) {
    abs(lx, innerY + 0.08, sw, sw, { backgroundColor: p.colour, borderRadius: 3 })
    const textW = Math.min(2.8, p.label.length * 0.075 + 0.14)
    abs(lx + sw + 0.08, innerY, textW, legendH, {
      color: '#FFFFFF',
      fontSize: 10,
      display: 'flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
    }, p.label)
    lx += sw + 0.08 + textW + 0.34
  }

  const LW = 0.64
  const funcTop = innerY + legendH + 0.06
  const remaining = innerH - legendH - 0.06
  const funcH = remaining * 0.64
  const dividerY = funcTop + funcH + 0.05
  const platTop = dividerY + 0.05
  const platH = innerY + innerH - platTop

  /* Functional layer */
  abs(innerX, funcTop, LW - 0.06, funcH, {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'pre-line',
  }, 'Functional\nLayer')

  const columns: { tiles: ScopeTile[] }[] = []
  const spans: { label: string; start: number; count: number }[] = []
  for (const group of FUNCTIONAL_GROUPS) {
    const start = columns.length
    for (const col of group.columns) columns.push({ tiles: col })
    spans.push({ label: group.label, start, count: group.columns.length })
  }

  const colsX = innerX + LW
  const colsW = innerW - LW
  const colW = colsW / columns.length
  const headerH = 0.34
  const tileAreaTop = funcTop
  const tileAreaH = funcH - headerH
  const maxRows = Math.max(...columns.map((c) => c.tiles.length))
  const rowH = tileAreaH / maxRows
  const gapX = 0.04
  const gapY = 0.028

  columns.forEach((column, i) => {
    const cx = colsX + i * colW
    const top = tileAreaTop + (maxRows - column.tiles.length) * rowH
    column.tiles.forEach((t, j) => {
      tile(cx + gapX / 2, top + j * rowH + gapY / 2, colW - gapX, rowH - gapY, t.name, fillFor(t.id), 5)
    })
  })

  for (const s of spans) {
    abs(colsX + s.start * colW, tileAreaTop + tileAreaH + 0.02, s.count * colW, headerH - 0.02, {
      color: HEADER_CYAN,
      fontSize: 6,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      textAlign: 'center',
      lineHeight: 1,
    }, s.label)
  }

  /* Divider */
  abs(innerX, dividerY, innerW, 0, { borderTop: '0.75px dashed rgba(255,255,255,0.4)' })

  /* Platform layer */
  abs(innerX, platTop, LW - 0.06, platH, {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'pre-line',
  }, 'Platform &\nTechnical\nLayer')

  const platX = innerX + LW
  const platW = innerW - LW
  const g = 0.06
  const secLabelH = 0.2
  const aiH = 0.26
  const platRowH = 0.32
  const deployH = 0.26
  const secTilesH = Math.max(0.2, platH - secLabelH - 0.04 - aiH - platRowH - deployH - 3 * g)

  const sectionW = platW / TECHNICAL_SECTIONS.length
  TECHNICAL_SECTIONS.forEach((section, si) => {
    const sx = platX + si * sectionW
    abs(sx, platTop, sectionW - 0.06, secLabelH, {
      color: '#FFFFFF',
      fontSize: 8.5,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
    }, section.label)
    const tilesY = platTop + secLabelH + 0.04
    const tw = (sectionW - 0.06) / section.tiles.length
    section.tiles.forEach((t, ti) => {
      tile(sx + ti * tw + 0.02, tilesY, tw - 0.04, secTilesH, t.name, fillFor(t.id), 6)
    })
  })

  const aiY = platTop + secLabelH + 0.04 + secTilesH + g
  tile(platX, aiY, platW, aiH, IFS_AI_FOUNDATION.name, fillFor(IFS_AI_FOUNDATION.id), 9, true)

  const prY = aiY + aiH + g
  const ptw = platW / PLATFORM_TILES.length
  PLATFORM_TILES.forEach((t, ti) => {
    tile(platX + ti * ptw + 0.02, prY, ptw - 0.04, platRowH, t.name, fillFor(t.id), 6)
  })

  const depY = prY + platRowH + g
  abs(platX, depY, platW, deployH, {
    backgroundColor: DEPLOY_BAR,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }, DEPLOYMENT_LABEL)

  return <>{nodes}</>
}
