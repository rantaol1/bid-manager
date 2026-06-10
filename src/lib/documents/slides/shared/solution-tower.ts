import type pptxgen from 'pptxgenjs'
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
 * Renders the Scope "solution set overview" tower (the colour-coded tile grid
 * shown in the Scope tab) onto a pptxgenjs slide within the given bounding box.
 * Tiles are filled with the colour of the phase they are assigned to; unassigned
 * tiles are white — matching the web app exactly.
 *
 * The vertical budget below is exact (every band sums to the inner height) and
 * fonts are sized so the longest tile names fit without spilling; `shrinkText`
 * is a belt-and-braces safety net so nothing can ever overlap.
 */

const PANEL = '231047' // deep indigo panel
const DEPLOY_BAR = '160F33'
const HEADER_CYAN = '4FD0E3'
const UNSET = 'FFFFFF'
const FONT = 'Arial'

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

function hex(c: string): string {
  return c.replace('#', '').toUpperCase()
}

/** Black or white text depending on the fill's luminance. */
function readableText(fill: string): string {
  const h = hex(fill)
  if (h.length !== 6) return '1A1A1A'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '1A1A1A' : 'FFFFFF'
}

/** Adds a full-bleed tower slide (no title/footer chrome) and returns it. */
export function addSolutionTowerSlide(pptx: pptxgen, scope: TowerScope) {
  const slide = pptx.addSlide()
  slide.background = { color: 'FFFFFF' }
  drawSolutionTower(slide, scope, { x: 0.08, y: 0.08, w: 9.84, h: 5.465 })
  return slide
}

export function drawSolutionTower(slide: pptxgen.Slide, scope: TowerScope, box: Box) {
  const phaseColour = new Map(scope.phases.map((p) => [p.id, hex(p.colour)]))
  const fillFor = (tileId: string): string => {
    const phaseId = scope.modules[tileId]?.phaseId
    const selected = scope.modules[tileId]?.selected
    if (selected && phaseId && phaseColour.has(phaseId)) return phaseColour.get(phaseId) as string
    return UNSET
  }

  // Panel background.
  slide.addShape('roundRect', {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fill: { color: PANEL },
    line: { type: 'none' },
    rectRadius: 0.06,
  })

  const pad = 0.12
  const innerX = box.x + pad
  const innerY = box.y + pad
  const innerW = box.w - 2 * pad
  const innerH = box.h - 2 * pad

  const tile = (x: number, y: number, w: number, h: number, name: string, fill: string, fontSize: number, bold = false) => {
    slide.addShape('roundRect', {
      x,
      y,
      w,
      h,
      fill: { color: fill },
      line: fill === UNSET ? { color: 'D7D2E6', width: 0.5 } : { type: 'none' },
      rectRadius: 0.03,
    })
    slide.addText(name, {
      x: x + 0.02,
      y: y + 0.005,
      w: w - 0.04,
      h: h - 0.01,
      fontFace: FONT,
      fontSize,
      bold,
      color: readableText(fill),
      align: 'center',
      valign: 'middle',
      lineSpacingMultiple: 0.82,
      shrinkText: true,
      margin: 0.5,
    })
  }

  /* ---------- Legend ---------- */
  const legendH = 0.36
  let lx = innerX
  const ly = innerY
  const sw = 0.2
  for (const p of scope.phases) {
    slide.addShape('roundRect', { x: lx, y: ly + 0.08, w: sw, h: sw, fill: { color: hex(p.colour) }, line: { type: 'none' }, rectRadius: 0.03 })
    const textW = Math.min(2.8, p.label.length * 0.075 + 0.14)
    slide.addText(p.label, {
      x: lx + sw + 0.08,
      y: ly,
      w: textW,
      h: legendH,
      fontFace: FONT,
      fontSize: 10,
      color: 'FFFFFF',
      valign: 'middle',
    })
    lx += sw + 0.08 + textW + 0.34
  }

  /* ---------- Vertical budget (sums exactly to innerH) ---------- */
  const LW = 0.64 // left gutter for layer labels
  const funcTop = innerY + legendH + 0.06
  const remaining = innerH - legendH - 0.06
  const funcH = remaining * 0.64
  const dividerY = funcTop + funcH + 0.05
  const platTop = dividerY + 0.05
  const platH = innerY + innerH - platTop

  /* ---------- Functional Layer ---------- */
  slide.addText('Functional\nLayer', {
    x: innerX,
    y: funcTop,
    w: LW - 0.06,
    h: funcH,
    fontFace: FONT,
    fontSize: 7,
    bold: true,
    color: 'FFFFFF',
    valign: 'middle',
  })

  // Flatten groups into columns, tracking each group's column span for headers.
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
    const k = column.tiles.length
    const top = tileAreaTop + (maxRows - k) * rowH // bottom-align
    column.tiles.forEach((t, j) => {
      const ty = top + j * rowH
      tile(cx + gapX / 2, ty + gapY / 2, colW - gapX, rowH - gapY, t.name, fillFor(t.id), 5)
    })
  })

  // Group headers (cyan, centred under each group's column span).
  for (const s of spans) {
    slide.addText(s.label, {
      x: colsX + s.start * colW,
      y: tileAreaTop + tileAreaH + 0.02,
      w: s.count * colW,
      h: headerH - 0.02,
      fontFace: FONT,
      fontSize: 6,
      bold: true,
      color: HEADER_CYAN,
      align: 'center',
      valign: 'top',
      lineSpacingMultiple: 0.9,
      shrinkText: true,
    })
  }

  /* ---------- Divider ---------- */
  slide.addShape('line', {
    x: innerX,
    y: dividerY,
    w: innerW,
    h: 0,
    line: { color: 'FFFFFF', width: 0.75, dashType: 'dash', transparency: 60 },
  })

  /* ---------- Platform & Technical Layer ---------- */
  slide.addText('Platform &\nTechnical\nLayer', {
    x: innerX,
    y: platTop,
    w: LW - 0.06,
    h: platH,
    fontFace: FONT,
    fontSize: 7,
    bold: true,
    color: 'FFFFFF',
    valign: 'middle',
  })

  const platX = innerX + LW
  const platW = innerW - LW
  const g = 0.06
  const secLabelH = 0.2
  const aiH = 0.26
  const platRowH = 0.32
  const deployH = 0.26
  const secTilesH = Math.max(0.2, platH - secLabelH - 0.04 - aiH - platRowH - deployH - 3 * g)

  // Three technical sections side by side.
  const sectionW = platW / TECHNICAL_SECTIONS.length
  TECHNICAL_SECTIONS.forEach((section, si) => {
    const sx = platX + si * sectionW
    slide.addText(section.label, {
      x: sx,
      y: platTop,
      w: sectionW - 0.06,
      h: secLabelH,
      fontFace: FONT,
      fontSize: 8.5,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    })
    const tilesY = platTop + secLabelH + 0.04
    const tw = (sectionW - 0.06) / section.tiles.length
    section.tiles.forEach((t, ti) => {
      tile(sx + ti * tw + 0.02, tilesY, tw - 0.04, secTilesH, t.name, fillFor(t.id), 6)
    })
  })

  // IFS.ai Foundation full-width bar.
  const aiY = platTop + secLabelH + 0.04 + secTilesH + g
  tile(platX, aiY, platW, aiH, IFS_AI_FOUNDATION.name, fillFor(IFS_AI_FOUNDATION.id), 9, true)

  // Platform tile row.
  const prY = aiY + aiH + g
  const ptw = platW / PLATFORM_TILES.length
  PLATFORM_TILES.forEach((t, ti) => {
    tile(platX + ti * ptw + 0.02, prY, ptw - 0.04, platRowH, t.name, fillFor(t.id), 6)
  })

  // Cloud deployment static bar.
  const depY = prY + platRowH + g
  slide.addShape('roundRect', { x: platX, y: depY, w: platW, h: deployH, fill: { color: DEPLOY_BAR }, line: { color: 'FFFFFF', width: 0.5, transparency: 80 }, rectRadius: 0.03 })
  slide.addText(DEPLOYMENT_LABEL, {
    x: platX,
    y: depY,
    w: platW,
    h: deployH,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle',
  })
}
