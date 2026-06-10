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
  addNumberedSteps,
  addPlaceholder,
} from '../shared/branding'
import { addSolutionTowerSlide } from '../shared/solution-tower'
import { richTextToPptxRuns } from '@/lib/documents/rich-text-pptx'
import { richTextIsEmpty } from '@/lib/rich-text'

function selectedModuleNames(data: ProposalData): string[] {
  return IFS_MODULES.filter((m) => data.scope.modules[m.id]?.selected).map((m) => m.name)
}

export function executiveSummaryBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, {
    label: 'Executive Summary',
    title: `Why ${data.meta.customerName} should choose Arcwide`,
    slideNumber: n,
  })
  const es = data.narrative.executiveSummary
  const props = [es?.whatWePropose, es?.howWeDeliver, es?.whyArcwide].map((t) => t?.trim()).filter(Boolean) as string[]
  if (props.length) {
    addCards(slide, props.slice(0, 3).map((p, i) => ({ title: ['Our solution', 'Our delivery', 'Our edge'][i], description: p })), { y: 1.5, cols: 3, h: 2.2 })
  } else {
    addBullets(slide, [
      'A proven IFS Cloud solution tailored to your priorities',
      'Standard-first, prototype-led delivery that de-risks the programme',
      'An Elite IFS partner backed by BearingPoint scale',
    ], { y: 1.6, fontSize: 14 })
  }
}

export function understandingBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Understanding', title: 'Your business and drivers', slideNumber: n })
  const drivers = data.narrative.valueDrivers
  if (drivers.length) {
    addCards(slide, drivers.slice(0, 4).map((d) => ({ title: d.driver || '—', description: d.targetOutcome || '' })), {
      y: 1.5,
      cols: Math.min(drivers.length, 4),
      h: 2.2,
    })
  } else {
    addCards(
      slide,
      [
        { title: 'Industry', description: data.meta.customerIndustry || 'Not specified' },
        { title: 'Country', description: data.meta.customerCountry || 'Not specified' },
        { title: 'Scope', description: `${selectedModuleNames(data).length} IFS Cloud modules` },
      ],
      { y: 1.5, cols: 3, h: 2.0 }
    )
  }
}

export function solutionBoard(pptx: pptxgen, data: ProposalData, n: number) {
  if (selectedModuleNames(data).length === 0) {
    const slide = contentSlide(pptx, { label: 'Solution', title: 'IFS Cloud scope at a glance', slideNumber: n })
    addPlaceholder(slide, 'Assign modules to phases in the Scope tab to populate this slide.')
    return
  }
  // Full-bleed tower slide (the legend acts as the header).
  addSolutionTowerSlide(pptx, data.scope)
}

export function scopeBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Scope', title: 'In scope / out of scope', slideNumber: n })
  slide.addText('In scope', { x: SLIDE.margin, y: 1.35, w: 4.3, h: 0.3, fontFace: BRAND.font, fontSize: 13, bold: true, color: BRAND.black })
  slide.addText('Out of scope', { x: SLIDE.margin + 4.7, y: 1.35, w: 4.3, h: 0.3, fontFace: BRAND.font, fontSize: 13, bold: true, color: BRAND.black })
  const inScope = selectedModuleNames(data)
  addBullets(slide, inScope.length ? inScope : ['To be defined'], { x: SLIDE.margin, y: 1.75, w: 4.3, h: 3.2, fontSize: 12 })
  addBullets(slide, data.scope.exclusions.length ? data.scope.exclusions : ['None recorded'], { x: SLIDE.margin + 4.7, y: 1.75, w: 4.3, h: 3.2, fontSize: 12 })
}

export function approachBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Approach', title: 'How we deliver', slideNumber: n })
  const phases = data.content.methodologyPhases.map((p) => p.phase)
  addNumberedSteps(slide, phases, { y: 1.8, h: 1.8 })
  slide.addText(`Indicative duration: ~${data.summary.durationMonths} months`, {
    x: SLIDE.margin,
    y: 3.9,
    w: SLIDE.contentW,
    h: 0.4,
    fontFace: BRAND.font,
    fontSize: 13,
    bold: true,
    color: BRAND.magenta,
  })
}

export function commitmentBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Commitment', title: 'What success requires from you', slideNumber: n })
  addCards(slide, data.content.customerCommitments, { y: 1.4, cols: 3, h: 1.5, rowGap: 0.3 })
}

export function investmentBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Investment', title: 'Indicative investment', slideNumber: n })
  const { projectTotalCost, currency, durationMonths } = data.summary
  slide.addText(formatCurrency(projectTotalCost, currency), {
    x: SLIDE.margin,
    y: 1.4,
    w: 4.2,
    h: 0.9,
    fontFace: BRAND.font,
    fontSize: 36,
    bold: true,
    color: BRAND.magenta,
    valign: 'middle',
  })
  slide.addText(`Indicative total over ~${durationMonths} months`, {
    x: SLIDE.margin,
    y: 2.3,
    w: 4.2,
    h: 0.3,
    fontFace: BRAND.font,
    fontSize: 11,
    color: BRAND.midGray,
  })
  const map = new Map<string, number>()
  for (const p of data.summary.phases) map.set(p.rolloutName, (map.get(p.rolloutName) ?? 0) + p.totalCost)
  const rows = [...map.entries()]
  if (rows.length) {
    brandedTable(slide, ['Cost element', 'Amount'], rows.map(([name, cost]) => [name, formatCurrency(cost, currency)]), {
      x: 5.0,
      y: 1.4,
      w: 4.5,
      colW: [3.0, 1.5],
      fontSize: 11,
    })
  }
}

export function whyArcwideBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Why Arcwide', title: 'Why Arcwide', slideNumber: n })
  addCards(slide, data.content.whyArcwide, { y: 1.5, cols: 2, h: 1.5, rowGap: 0.3 })
}

export function recommendationBoard(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Recommendation', title: 'Recommendation & next steps', slideNumber: n })
  const empty = richTextIsEmpty(data.narrative.recommendation)
  slide.addText(
    empty
      ? '[Add the recommendation statement in the proposal builder.]'
      : richTextToPptxRuns(data.narrative.recommendation, { fontSize: 14 }),
    {
      x: SLIDE.margin,
      y: 1.4,
      w: SLIDE.contentW,
      h: 1.4,
      fontFace: BRAND.font,
      fontSize: 14,
      italic: empty,
      color: BRAND.darkGray,
      valign: 'top',
    }
  )
  addNumberedSteps(slide, ['Board decision', 'Commercial negotiation', 'Contract & mobilise', 'Initiate'], { y: 3.2, h: 1.7 })
}
