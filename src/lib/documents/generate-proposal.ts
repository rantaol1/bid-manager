import PptxGenJS from 'pptxgenjs'
import { format } from 'date-fns'
import type { ProposalData } from '@/lib/documents/proposal-data'
import { getSections, type DeliverableType } from '@/lib/documents/proposal-sections'
import { addCoverSlide } from '@/lib/documents/slides/shared/cover-slide'
import { addDividerSlide } from '@/lib/documents/slides/shared/divider-slide'
import { addContentsSlide } from '@/lib/documents/slides/shared/contents-slide'

interface GenerateArgs {
  type: DeliverableType
  selectedSections: string[]
  data: ProposalData
  version: number
}

/** Build the proposal PPTX from the selected sections and resolved data. */
export async function generateProposalPptx({ type, selectedSections, data, version }: GenerateArgs): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'Arcwide Bid Manager'
  pptx.company = 'Arcwide'
  pptx.title = data.meta.opportunityName

  const selected = new Set(selectedSections)
  const sections = getSections(type).filter((s) => s.kind === 'cover' || selected.has(s.id))

  // Titles of the content sections that will actually appear (for the TOC).
  const contentTitles = sections.filter((s) => s.kind === 'content').map((s) => s.title)

  const dateStr = format(new Date(), 'd MMMM yyyy')
  const isBoard = type === 'board_summary'

  let slideNumber = 0
  for (const section of sections) {
    switch (section.kind) {
      case 'cover':
        addCoverSlide(pptx, {
          title: data.meta.opportunityName,
          customer: data.meta.customerName,
          subtitle: isBoard ? 'Board Decision Summary' : 'IFS Cloud Implementation Proposal',
          dateStr,
          version,
        })
        break
      case 'contents':
        slideNumber += 1
        addContentsSlide(pptx, contentTitles, slideNumber)
        break
      case 'divider':
        addDividerSlide(pptx, {
          number: section.dividerNumber ?? '',
          title: section.dividerSubtitle ?? section.title,
        })
        break
      case 'content':
        if (section.builder) {
          slideNumber += 1
          section.builder(pptx, data, slideNumber)
        }
        break
    }
  }

  const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  return buf
}
