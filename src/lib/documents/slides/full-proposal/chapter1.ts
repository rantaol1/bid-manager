import type pptxgen from 'pptxgenjs'
import { IFS_MODULES } from '@/lib/constants/ifs-modules'
import { formatCurrency } from '@/lib/utils'
import type { ProposalData } from '@/lib/documents/proposal-data'
import {
  BRAND,
  SLIDE,
  contentSlide,
  brandedTable,
  addBullets,
  addCards,
  addPlaceholder,
} from '../shared/branding'
import { addSolutionTowerSlide } from '../shared/solution-tower'
import { richTextToPptxRuns } from '@/lib/documents/rich-text-pptx'
import { richTextIsEmpty } from '@/lib/rich-text'

const MODULE_BY_ID = new Map<string, (typeof IFS_MODULES)[number]>(IFS_MODULES.map((m) => [m.id, m]))
const FITGAP_LABEL: Record<string, string> = { fit: 'Fit', partial: 'Partial', gap: 'Gap' }
const PRIORITY_LABEL: Record<string, string> = { must: 'Must', should: 'Should', could: 'Could', wont: "Won't" }

function selectedModules(data: ProposalData) {
  return IFS_MODULES.filter((m) => data.scope.modules[m.id]?.selected).map((m) => ({
    ...m,
    fitGap: data.scope.modules[m.id]?.fitGap,
  }))
}

export function executiveSummarySlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Executive Summary', title: 'Executive summary', slideNumber: n })
  const es = data.narrative.executiveSummary
  const investmentDefault = `Indicative investment of ${formatCurrency(
    data.summary.projectTotalCost,
    data.summary.currency
  )} over approximately ${data.summary.durationMonths} months.`
  const items = [
    `The opportunity — ${es?.opportunity?.trim() || '[add the customer’s situation and goals]'}`,
    `What we propose — ${es?.whatWePropose?.trim() || '[summarise the proposed IFS Cloud solution]'}`,
    `How we deliver — ${es?.howWeDeliver?.trim() || '[describe the delivery approach and timeline]'}`,
    `Investment — ${es?.investment?.trim() || investmentDefault}`,
    `Why Arcwide — ${es?.whyArcwide?.trim() || '[state the differentiators]'}`,
  ]
  addBullets(slide, items, { y: 1.4, fontSize: 13, h: 3.6 })
}

export function understandingSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Understanding', title: 'Our understanding', slideNumber: n })
  const empty = richTextIsEmpty(data.narrative.understanding)
  slide.addText(
    empty
      ? '[Add a narrative about the customer’s business, challenges and objectives.]'
      : richTextToPptxRuns(data.narrative.understanding, { fontSize: 13 }),
    {
      x: SLIDE.margin,
      y: 1.4,
      w: SLIDE.contentW,
      h: 2.0,
      fontFace: BRAND.font,
      fontSize: 13,
      italic: empty,
      color: BRAND.darkGray,
      valign: 'top',
    }
  )
  addCards(
    slide,
    [
      { title: 'Industry', description: data.meta.customerIndustry || 'Not specified' },
      { title: 'Country', description: data.meta.customerCountry || 'Not specified' },
      { title: 'Modules in scope', description: `${selectedModules(data).length} IFS Cloud modules` },
    ],
    { y: 3.55, cols: 3, h: 1.3 }
  )
}

export function valueDriversSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Value', title: 'Business drivers → target outcomes', slideNumber: n })
  const drivers = data.narrative.valueDrivers
  if (drivers.length === 0) {
    addPlaceholder(slide, 'Add up to four business drivers in the proposal builder to populate this slide.')
    return
  }
  brandedTable(
    slide,
    ['Business driver', 'IFS capability', 'Target outcome'],
    drivers.map((d) => [d.driver || '—', d.ifsCapability || '—', d.targetOutcome || '—']),
    { y: 1.4, colW: [3, 3, 3], fontSize: 12 }
  )
}

export function solutionOverviewSlide(pptx: pptxgen, data: ProposalData, n: number) {
  if (selectedModules(data).length === 0) {
    const slide = contentSlide(pptx, { label: 'Solution', title: 'Solution set overview & phasing', slideNumber: n })
    addPlaceholder(slide, 'Assign modules to phases in the Scope tab to populate the solution set overview.')
    return
  }
  // Full-bleed tower slide (the legend acts as the header).
  addSolutionTowerSlide(pptx, data.scope)
}

export function scopeInSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Scope', title: 'In scope — by module', slideNumber: n })
  const mods = selectedModules(data)
  if (mods.length === 0) {
    addPlaceholder(slide, 'Select modules in the Scope tab to populate the in-scope table.')
    return
  }
  brandedTable(
    slide,
    ['Module', 'In-scope processes', 'Fit'],
    mods.map((m) => [m.name, m.description, m.fitGap ? FITGAP_LABEL[m.fitGap] : '—']),
    { y: 1.4, colW: [2.2, 5.6, 1.2], fontSize: 10.5 }
  )
}

export function scopeOutSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Scope', title: 'Out of scope & deferred', slideNumber: n })
  const deferred = data.scope.deferred
  slide.addText('Explicitly out of scope', { x: SLIDE.margin, y: 1.35, w: 4.3, h: 0.3, fontFace: BRAND.font, fontSize: 13, bold: true, color: BRAND.black })
  slide.addText('Deferred to a later phase', { x: SLIDE.margin + 4.7, y: 1.35, w: 4.3, h: 0.3, fontFace: BRAND.font, fontSize: 13, bold: true, color: BRAND.black })
  addBullets(slide, data.scope.exclusions.length ? data.scope.exclusions : ['None recorded'], { x: SLIDE.margin, y: 1.75, w: 4.3, h: 3.2, fontSize: 11 })
  addBullets(slide, deferred.length ? deferred : ['None recorded'], { x: SLIDE.margin + 4.7, y: 1.75, w: 4.3, h: 3.2, fontSize: 11 })
}

export function assumptionsSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Assumptions', title: 'Assumptions & dependencies', slideNumber: n })
  const a = data.scope.assumptions
  if (a.length === 0) {
    addPlaceholder(slide, 'Add assumptions in the Scope tab to populate this slide.')
    return
  }
  const half = Math.ceil(a.length / 2)
  addBullets(slide, a.slice(0, half), { x: SLIDE.margin, y: 1.4, w: 4.3, h: 3.4, fontSize: 12 })
  addBullets(slide, a.slice(half), { x: SLIDE.margin + 4.7, y: 1.4, w: 4.3, h: 3.4, fontSize: 12 })
}

export function fitAssessmentSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Fit Assessment', title: 'High-level fit assessment', slideNumber: n })
  const reqs = data.scope.requirements
  if (reqs.length === 0) {
    addPlaceholder(slide, 'Add requirements in the Scope tab to populate the fit assessment.')
    return
  }
  brandedTable(
    slide,
    ['Requirement', 'Module', 'Priority', 'Fit'],
    reqs.slice(0, 12).map((r) => [
      r.title,
      r.moduleId ? MODULE_BY_ID.get(r.moduleId)?.name ?? r.moduleId : '—',
      PRIORITY_LABEL[r.priority] ?? r.priority,
      FITGAP_LABEL[r.fitGap] ?? r.fitGap,
    ]),
    { y: 1.4, colW: [4.4, 2.2, 1.2, 1.2], fontSize: 10.5 }
  )
}
