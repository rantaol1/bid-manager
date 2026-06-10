import type pptxgen from 'pptxgenjs'
import { addRoadmap } from '@/lib/documents/pptx-helpers'
import { formatRaciCell } from '@/lib/raci'
import { DEFAULT_RISKS } from '../static-content'
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
  const g = data.content.governance
  addCards(
    slide,
    [
      { title: 'Steering Committee', description: g.steering },
      { title: 'Joint PMO', description: g.pmo },
    ],
    { y: 1.4, cols: 2, h: 1.6 }
  )
  slide.addText('Workstreams', { x: SLIDE.margin, y: 3.25, w: SLIDE.contentW, h: 0.3, fontFace: BRAND.font, fontSize: 13, bold: true, color: BRAND.black })
  addCards(
    slide,
    g.workstreams.map((w) => ({ title: w, description: '' })),
    { y: 3.6, cols: Math.min(g.workstreams.length || 1, 4), h: 0.9 }
  )
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
