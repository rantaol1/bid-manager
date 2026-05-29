import PptxGenJS from 'pptxgenjs'
import { format } from 'date-fns'
import { titleSlide, contentSlide, addRoadmap, PPTX_BRAND } from '@/lib/documents/pptx-helpers'
import type { DocData } from '@/lib/documents/doc-data'

export async function generateTimelinePptx(data: DocData): Promise<Buffer> {
  const { estimation } = data
  const { opportunity, rollouts } = estimation
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'Arcwide Bid Manager'

  const dateStr = format(new Date(), 'd MMMM yyyy')

  // 1. Title
  titleSlide(pptx, 'Project Timeline', opportunity.customerName, dateStr)

  // 2. Roadmap
  const roadmap = contentSlide(pptx, opportunity.name)
  addRoadmap(pptx, roadmap, estimation)

  // 3. Phase detail table
  const detail = contentSlide(pptx, 'Phase detail')
  const header = ['Rollout', 'Phase', 'Start', 'End', 'Working days'].map((t) => ({
    text: t,
    options: { bold: true, color: 'FFFFFF', fill: { color: PPTX_BRAND.magenta }, fontFace: 'Arial' },
  }))
  const rows = rollouts.flatMap((ro) =>
    ro.phases.map((ph) => [
      { text: ro.name, options: { fontFace: 'Arial' } },
      { text: ph.name, options: { fontFace: 'Arial' } },
      { text: format(new Date(ph.startDate), 'dd/MM/yyyy'), options: { fontFace: 'Arial' } },
      { text: format(new Date(ph.endDate), 'dd/MM/yyyy'), options: { fontFace: 'Arial' } },
      { text: String(ph.workingDays), options: { fontFace: 'Arial', align: 'right' as const } },
    ])
  )
  detail.addTable([header, ...rows], {
    x: 0.5,
    y: 1.0,
    w: 9,
    fontSize: 11,
    border: { type: 'solid', color: 'D9D9D9', pt: 0.5 },
    autoPage: true,
  })

  const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  return buf
}
