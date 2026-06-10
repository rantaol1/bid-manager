import type pptxgen from 'pptxgenjs'
import { formatCurrency } from '@/lib/utils'
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
import { richTextToPptxRuns } from '@/lib/documents/rich-text-pptx'
import { richTextIsEmpty } from '@/lib/rich-text'

/** Sum phase costs by rollout name. */
function costByRollout(data: ProposalData): Array<[string, number]> {
  const map = new Map<string, number>()
  for (const p of data.summary.phases) {
    map.set(p.rolloutName, (map.get(p.rolloutName) ?? 0) + p.totalCost)
  }
  return [...map.entries()]
}

export function commercialsSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Commercials', title: 'Indicative investment', slideNumber: n })
  const { projectTotalCost, currency, durationMonths } = data.summary

  // Large callout
  slide.addText(formatCurrency(projectTotalCost, currency), {
    x: SLIDE.margin,
    y: 1.35,
    w: 4.2,
    h: 0.9,
    fontFace: BRAND.font,
    fontSize: 34,
    bold: true,
    color: BRAND.magenta,
    valign: 'middle',
  })
  slide.addText(`Indicative total over ~${durationMonths} months`, {
    x: SLIDE.margin,
    y: 2.25,
    w: 4.2,
    h: 0.3,
    fontFace: BRAND.font,
    fontSize: 11,
    color: BRAND.midGray,
  })

  const rollouts = costByRollout(data)
  if (rollouts.length) {
    brandedTable(
      slide,
      ['Cost element', 'Amount'],
      rollouts.map(([name, cost]) => [name, formatCurrency(cost, currency)]),
      { x: 5.0, y: 1.35, w: 4.5, colW: [3.0, 1.5], fontSize: 11 }
    )
  }

  const empty = richTextIsEmpty(data.narrative.commercialModel)
  slide.addText(
    empty
      ? '[Describe the commercial model — e.g. time & materials with a capped envelope, milestone-based, or fixed-price per phase.]'
      : richTextToPptxRuns(data.narrative.commercialModel, { fontSize: 12 }),
    {
      x: SLIDE.margin,
      y: 3.4,
      w: SLIDE.contentW,
      h: 1.4,
      fontFace: BRAND.font,
      fontSize: 12,
      italic: empty,
      color: BRAND.darkGray,
      valign: 'top',
    }
  )
}

export function whyArcwideSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Why Arcwide', title: 'Why Arcwide', slideNumber: n })
  addCards(slide, data.content.whyArcwide, { y: 1.4, cols: 2, h: 1.5, rowGap: 0.3 })
}

export function teamReferencesSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'References', title: 'Key people & references', slideNumber: n })
  const people = data.narrative.teamProfiles
  const refs = data.narrative.references

  slide.addText('Key people', { x: SLIDE.margin, y: 1.3, w: SLIDE.contentW, h: 0.3, fontFace: BRAND.font, fontSize: 13, bold: true, color: BRAND.black })
  if (people.length) {
    addCards(slide, people.map((p) => ({ title: p.name || '—', description: p.role || '' })), { y: 1.65, cols: Math.min(people.length, 4), h: 0.95 })
  } else {
    addPlaceholder(slide, 'Add key people in the proposal builder.', 1.7)
  }

  slide.addText('References', { x: SLIDE.margin, y: 2.85, w: SLIDE.contentW, h: 0.3, fontFace: BRAND.font, fontSize: 13, bold: true, color: BRAND.black })
  if (refs.length) {
    brandedTable(
      slide,
      ['Client', 'Scope', 'Outcome'],
      refs.map((r) => [r.name || '—', r.scope || '—', r.outcome || '—']),
      { y: 3.2, colW: [2.2, 3.4, 3.4], fontSize: 10.5 }
    )
  } else {
    addPlaceholder(slide, 'Add reference stories in the proposal builder.', 3.25)
  }
}

export function nextStepsSlide(pptx: pptxgen, data: ProposalData, n: number) {
  const slide = contentSlide(pptx, { label: 'Next Steps', title: 'The path forward', slideNumber: n })
  addNumberedSteps(slide, ['Board decision', 'Commercial negotiation', 'Contract & mobilise', 'Initiate'], { y: 1.6, h: 1.8 })

  const c = data.narrative
  const contactLines = [c.contactName, c.contactTitle, c.contactEmail, c.contactPhone].filter(Boolean).join('  ·  ')
  slide.addText(contactLines || '[Add contact details in the proposal builder.]', {
    x: SLIDE.margin,
    y: 3.9,
    w: SLIDE.contentW,
    h: 0.6,
    fontFace: BRAND.font,
    fontSize: 12,
    italic: !contactLines,
    color: BRAND.darkGray,
  })
}
