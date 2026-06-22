import type pptxgen from 'pptxgenjs'
import { addRoadmap } from '@/lib/documents/pptx-helpers'
import { formatRaciCell } from '@/lib/raci'
import { applyGovTokens } from '@/lib/governance'
import { DEFAULT_RISKS } from '../static-content'
import { computeOrgLayout, type OrgConnector } from '../shared/org-chart-layout'
import type { ProposalData } from '@/lib/documents/proposal-data'
import {
  BRAND,
  SLIDE,
  contentSlide,
  brandedTable,
  addCards,
  addNumberedSteps,
  addPlaceholder,
} from '../shared/branding'

const CRIM_TYPE_LABEL: Record<string, string> = {
  C: 'Customisation',
  R: 'Report',
  I: 'Integration',
  M: 'Migration',
}
const COMPLEXITY_LABEL: Record<string, string> = { low: 'Low', med: 'Medium', high: 'High' }
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function methodologySlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Methodology', title: 'IFS Cloud methodology', slideNumber: n })
  brandedTable(
    slide,
    ['Phase', 'Focus', 'Key deliverables'],
    data.content.methodologyPhases.map((p) => [p.phase, p.focus, p.deliverables]),
    { y: 1.4, colW: [2, 3.5, 3.5], fontSize: 10.5 }
  )
}

export function waysOfWorkingSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Ways of Working', title: 'The Arcwide delivery wrap', slideNumber: n })
  addCards(slide, data.content.waysOfWorking, { y: 1.5, cols: 2, h: 1.5, rowGap: 0.3 })
}

export function planSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Plan', title: 'Indicative project plan', slideNumber: n })
  addRoadmap(pptx, slide, data.estimation)
}

export function phasingSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Phasing', title: 'Release & rollout strategy', slideNumber: n })
  const rolloutNames = data.estimation.rollouts.map((r) => r.name)
  const steps = ['Template build', ...(rolloutNames.length ? rolloutNames : ['Lead site', 'Rollout waves']), 'Optimise']
  addNumberedSteps(slide, steps.slice(0, 5), { y: 1.7, h: 1.9 })
  slide.addText(
    `Delivery is structured across ${data.estimation.rollouts.length || 'multiple'} rollout${
      data.estimation.rollouts.length === 1 ? '' : 's'
    }, building a reusable template before scaling to further sites.`,
    { x: SLIDE.margin, y: 3.9, w: SLIDE.contentW, h: 0.8, fontFace: BRAND.font, fontSize: 12, color: BRAND.darkGray }
  )
}

export function governanceSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Governance', title: 'Project governance', slideNumber: n })
  const tok = { customer: data.meta.customerName, partner: data.branding.companyName }
  const bodies = data.content.governance.bodies
  if (bodies.length === 0) {
    addPlaceholder(slide, 'Add governance bodies in the Proposal tab to populate this slide.')
    return
  }

  // Layout bands (10 x 5.625 canvas). A left gutter carries rotated section labels.
  const tableX = SLIDE.margin
  const gutterW = 0.3
  const colsX = tableX + gutterW
  const colsW = SLIDE.contentW - gutterW
  const n0 = bodies.length
  const colW = colsW / n0
  const pad = 0.14

  const startY = 1.4
  const headerH = 0.6
  const cadenceH = 0.28
  const partH = 1.75
  const respH = 1.12
  const cadenceY = startY + headerH
  const partY = cadenceY + cadenceH
  const dividerY = partY + 0.95
  const respY = partY + partH

  // Rotated gutter label, centred on a band of height `h` at top `y`.
  const gutterLabel = (text: string, y: number, h: number, color: string) => {
    slide.addText(text.toUpperCase(), {
      x: tableX - h / 2 + gutterW / 2,
      y: y + h / 2 - 0.15,
      w: h,
      h: 0.3,
      rotate: 270,
      fontFace: BRAND.font,
      fontSize: 8,
      bold: true,
      color,
      charSpacing: 1,
      align: 'center',
      valign: 'middle',
    })
  }

  const bulletRuns = (items: string[], color: string, underlineFirst: boolean): pptxgen.TextProps[] => {
    const runs: pptxgen.TextProps[] = []
    for (const line of items) {
      const t = applyGovTokens(line, tok)
      if (!underlineFirst) {
        runs.push({ text: t, options: { bullet: { code: '2022', indent: 12 }, color, breakLine: true } })
        continue
      }
      const sp = t.indexOf(' ')
      const first = sp === -1 ? t : t.slice(0, sp)
      const rest = sp === -1 ? '' : t.slice(sp)
      runs.push({ text: first, options: { bullet: { code: '2022', indent: 12 }, color, underline: { style: 'sng' }, breakLine: false } })
      runs.push({ text: rest, options: { color, breakLine: true } })
    }
    return runs
  }

  // Header + responsibilities magenta bands span the full table width.
  slide.addShape('rect', { x: tableX, y: startY, w: SLIDE.contentW, h: headerH, fill: { color: BRAND.magenta }, line: { type: 'none' } })
  slide.addShape('rect', { x: tableX, y: respY, w: SLIDE.contentW, h: respH, fill: { color: BRAND.magenta }, line: { type: 'none' } })
  gutterLabel('Type', startY, headerH, BRAND.white)
  gutterLabel('Participants', partY, partH, BRAND.magenta)
  gutterLabel('Responsabilities', respY, respH, BRAND.white)

  // Full-width divider between customer and partner participants.
  slide.addShape('line', { x: colsX, y: dividerY, w: colsW, h: 0, line: { color: BRAND.magenta, width: 1 } })

  bodies.forEach((b, i) => {
    const x = colsX + i * colW
    // Header: body name (white, uppercase, bold).
    slide.addText(b.name.toUpperCase(), {
      x: x + pad,
      y: startY,
      w: colW - pad * 2,
      h: headerH,
      fontFace: BRAND.font,
      fontSize: 12,
      bold: true,
      color: BRAND.white,
      charSpacing: 1,
      valign: 'middle',
    })
    // Cadence (uppercase, gray, centred).
    slide.addText(b.cadence.toUpperCase(), {
      x: x + pad,
      y: cadenceY,
      w: colW - pad * 2,
      h: cadenceH,
      fontFace: BRAND.font,
      fontSize: 9,
      color: BRAND.midGray,
      charSpacing: 2,
      align: 'center',
      valign: 'middle',
    })
    // Customer participants (above divider).
    if (b.customerParticipants.length) {
      slide.addText(bulletRuns(b.customerParticipants, BRAND.darkGray, false), {
        x: x + pad,
        y: partY + 0.05,
        w: colW - pad * 2,
        h: dividerY - partY - 0.05,
        fontFace: BRAND.font,
        fontSize: 9,
        valign: 'top',
        paraSpaceAfter: 3,
      })
    }
    // Partner participants (below divider).
    if (b.partnerParticipants.length) {
      slide.addText(bulletRuns(b.partnerParticipants, BRAND.darkGray, false), {
        x: x + pad,
        y: dividerY + 0.08,
        w: colW - pad * 2,
        h: respY - dividerY - 0.1,
        fontFace: BRAND.font,
        fontSize: 9,
        valign: 'top',
        paraSpaceAfter: 3,
      })
    }
    // Responsibilities (white text on magenta, leading word underlined).
    if (b.responsibilities.length) {
      slide.addText(bulletRuns(b.responsibilities, BRAND.white, true), {
        x: x + pad,
        y: respY + 0.08,
        w: colW - pad * 2,
        h: respH - 0.16,
        fontFace: BRAND.font,
        fontSize: 8.5,
        valign: 'top',
        paraSpaceAfter: 4,
      })
    }
  })
}

export function teamSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Team', title: 'Proposed delivery team', slideNumber: n })
  const roles = data.summary.roles.filter((r) => r.totalDays > 0)
  if (roles.length === 0) {
    addPlaceholder(slide, 'Configure roles and allocations in the Estimation tab to populate the team.')
    return
  }
  const workingDaysInProject = Math.max(1, data.summary.durationMonths * 21)
  brandedTable(
    slide,
    ['Role', 'Total days', 'Indicative FTE'],
    roles.map((r) => [r.roleName, String(Math.round(r.totalDays)), (r.totalDays / workingDaysInProject).toFixed(1)]),
    { y: 1.4, colW: [5.4, 1.8, 1.8], fontSize: 11 }
  )
}

function drawOrgConnector(slide: pptxgen.Slide, c: OrgConnector) {
  const x = Math.min(c.x1, c.x2)
  const y = Math.min(c.y1, c.y2)
  const w = Math.abs(c.x2 - c.x1)
  const h = Math.abs(c.y2 - c.y1)
  const arrow = { type: 'triangle', size: 6 } as const
  // For 'end', the arrowhead sits at (x2,y2); axis-aligned lines put that at the
  // bounding box start when (x2,y2) is the min corner.
  const atBegin = c.arrow === 'both' || (c.x2 <= c.x1 && c.y2 <= c.y1)
  slide.addShape('line', {
    x,
    y,
    w,
    h,
    line: {
      color: BRAND.midGray,
      width: 1,
      beginArrowType: c.arrow === 'both' || (c.arrow === 'end' && atBegin) ? arrow.type : 'none',
      endArrowType: c.arrow === 'both' || (c.arrow === 'end' && !atBegin) ? arrow.type : 'none',
    },
  })
}

export function teamStructureSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Organisation', title: 'Project organisation', slideNumber: n })
  const tok = { customer: data.meta.customerName, partner: data.branding.companyName }
  const { boxes, connectors } = computeOrgLayout(data.content.teamStructure, tok)
  if (boxes.length === 0) {
    addPlaceholder(slide, 'Add teams in the Proposal tab to populate the organisation chart.')
    return
  }

  // Connectors first so the boxes sit on top of the lines.
  for (const c of connectors) drawOrgConnector(slide, c)

  for (const b of boxes) {
    if (b.kind === 'plain') {
      slide.addShape('roundRect', { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: b.fill }, line: { type: 'none' }, rectRadius: 0.05 })
      slide.addText(b.label, {
        x: b.x + 0.05,
        y: b.y,
        w: b.w - 0.1,
        h: b.h,
        fontFace: BRAND.font,
        fontSize: 10.5,
        bold: true,
        color: BRAND.white,
        align: 'center',
        valign: 'middle',
        fit: 'shrink',
      })
      continue
    }

    if (b.kind === 'arrow') {
      slide.addShape('leftRightArrow', { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: b.fill }, line: { type: 'none' } })
      slide.addText(b.label, {
        x: b.x + b.h,
        y: b.y,
        w: b.w - b.h * 2,
        h: b.h,
        fontFace: BRAND.font,
        fontSize: 9,
        bold: true,
        color: BRAND.white,
        align: 'center',
        valign: 'middle',
        fit: 'shrink',
      })
      continue
    }

    // team box: coloured header + white body with a coloured border.
    const headerH = b.headerH ?? 0.3
    slide.addShape('rect', { x: b.x, y: b.y + headerH, w: b.w, h: b.h - headerH, fill: { color: BRAND.white }, line: { color: b.fill, width: 1 } })
    slide.addShape('rect', { x: b.x, y: b.y, w: b.w, h: headerH, fill: { color: b.fill }, line: { type: 'none' } })
    slide.addText(b.label.toUpperCase(), {
      x: b.x + 0.04,
      y: b.y,
      w: b.w - 0.08,
      h: headerH,
      fontFace: BRAND.font,
      fontSize: 8.5,
      bold: true,
      color: BRAND.white,
      align: 'center',
      valign: 'middle',
      charSpacing: 1,
      fit: 'shrink',
    })

    const rows = b.rows ?? []
    if (rows.length) {
      const bodyH = b.h - headerH - 0.12
      const rowFont = Math.min(8, Math.max(5, (bodyH * 72) / rows.length) * 0.82)
      const runs: pptxgen.TextProps[] = rows.map((r) => ({
        text: (r.indent ? '  – ' : '') + r.text,
        options: { bold: r.bold, color: r.indent ? BRAND.midGray : BRAND.black, breakLine: true, paraSpaceAfter: 1 },
      }))
      slide.addText(runs, {
        x: b.x + 0.08,
        y: b.y + headerH + 0.06,
        w: b.w - 0.16,
        h: bodyH,
        fontFace: BRAND.font,
        fontSize: rowFont,
        valign: 'top',
        lineSpacingMultiple: 0.95,
      })
    }
  }
}

export function raciSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'RACI', title: 'RACI matrix', slideNumber: n })
  const { columns, rows } = data.content.raci
  if (rows.length === 0 || columns.length === 0) {
    addPlaceholder(slide, 'Add RACI activities and roles in the Proposal tab to populate this slide.')
    return
  }
  const activityW = 2.6
  const colW = Math.max(0.6, (9.0 - activityW) / columns.length)
  brandedTable(
    slide,
    ['Activity', ...columns.map((c) => c.label)],
    rows.map((r) => [r.activity, ...columns.map((c) => formatRaciCell(r.cells[c.id]))]),
    { y: 1.4, colW: [activityW, ...columns.map(() => colW)], fontSize: columns.length > 6 ? 8 : 9 }
  )
}

export function crimsSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'CRIMs', title: 'Customisations, reports, integrations & migrations', slideNumber: n })
  const crims = data.content.crims
  if (crims.length === 0) {
    addPlaceholder(slide, 'Add CRIM items in the proposal builder to populate this register.')
    return
  }
  brandedTable(
    slide,
    ['Type', 'Item', 'Description', 'Complexity'],
    crims.slice(0, 12).map((c) => [CRIM_TYPE_LABEL[c.type] ?? c.type, c.name, c.description ?? '—', COMPLEXITY_LABEL[c.complexity] ?? c.complexity]),
    { y: 1.4, colW: [1.6, 2.4, 3.8, 1.2], fontSize: 10 }
  )
}

export function customerCommitmentSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Customer', title: 'What we need from you', slideNumber: n })
  addCards(slide, data.content.customerCommitments, { y: 1.4, cols: 3, h: 1.5, rowGap: 0.3 })
}

function stepsSlide(pptx: pptxgen, label: string, title: string, steps: string[], n: number) {
  const slide = contentSlide(pptx, { label, title, slideNumber: n })
  addNumberedSteps(slide, steps, { y: 2.0, h: 2.0 })
}

export function dataMigrationSlide(pptx: pptxgen, data: ProposalData, n: number) {
  stepsSlide(pptx, 'Data Migration', 'Data migration approach', data.content.dataMigrationSteps, n)
}
export function integrationSlide(pptx: pptxgen, data: ProposalData, n: number) {
  stepsSlide(pptx, 'Integration', 'Integration approach', data.content.integrationSteps, n)
}
export function testingSlide(pptx: pptxgen, data: ProposalData, n: number) {
  stepsSlide(pptx, 'Quality', 'Quality assurance & testing', data.content.testingSteps, n)
}
export function adoptionSlide(pptx: pptxgen, data: ProposalData, n: number) {
  stepsSlide(pptx, 'Adoption', 'Training & change management', data.content.adoptionSteps, n)
}
export function goLiveSlide(pptx: pptxgen, data: ProposalData, n: number) {
  stepsSlide(pptx, 'Go Live', 'Cutover & hypercare', data.content.goLiveSteps, n)
}

export function riskSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Risk', title: 'Risk management', slideNumber: n })
  const rows = data.scope.risks.length
    ? data.scope.risks.map((r) => [r.title, cap(r.impact), r.mitigation ?? '—'])
    : DEFAULT_RISKS.map((r) => [r.risk, r.impact, r.mitigation])
  brandedTable(slide, ['Risk', 'Impact', 'Mitigation'], rows, { y: 1.4, colW: [3.4, 1.2, 4.4], fontSize: 10.5 })
}
