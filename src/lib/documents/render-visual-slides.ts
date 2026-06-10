import PptxGenJS from 'pptxgenjs'
import type { ProposalData } from '@/lib/documents/proposal-data'
import { getSections, type DeliverableType } from '@/lib/documents/proposal-sections'
import { setProposalFooter } from '@/lib/documents/slides/shared/branding'

/**
 * Render the app's native (code-drawn) visual slides for the splice sections — the
 * solution tower and timeline roadmap — into a standalone pptx buffer, in deck
 * order. `order[i]` is the section id of the (i+1)-th slide, so the composer can
 * address each visual by its 1-based slide number.
 */
export async function renderVisualSlides(
  type: DeliverableType,
  data: ProposalData,
  visualSplice: string[]
): Promise<{ buffer: Buffer | null; order: string[] }> {
  const spliceSet = new Set(visualSplice)
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'Arcwide Bid Manager'
  pptx.company = 'Arcwide'
  pptx.title = data.meta.opportunityName
  setProposalFooter(data.branding.footerText)

  const order: string[] = []
  let n = 0
  for (const section of getSections(type)) {
    if (section.kind === 'content' && section.builder && spliceSet.has(section.id)) {
      n += 1
      section.builder(pptx, data, n)
      order.push(section.id)
    }
  }

  if (order.length === 0) return { buffer: null, order }
  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  return { buffer, order }
}
