import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import type { ProposalData } from '@/lib/documents/proposal-data'
import type { DeliverableType } from '@/lib/documents/proposal-sections'
import { buildTemplateData } from '@/lib/templates/placeholder-schema'
import { renderVisualSlides } from '@/lib/documents/render-visual-slides'
import { composePptx } from '@/lib/documents/compose-pptx'
import type { PptxMapping } from '@/lib/schemas/pptx-deck-template'

/**
 * REPLACE-mode generation: compose the output deck from an uploaded .potx (mapped
 * per section) + the app's spliced visual slides, then fill `{placeholder}` /
 * `{#loop}` tokens with opportunity data. docxtemplater matches tags even when
 * PowerPoint splits them across runs, so no separate run-healing pass is needed.
 */
export async function generateFromPptxTemplate(args: {
  data: ProposalData
  type: DeliverableType
  potxBuffer: Buffer
  mapping: PptxMapping
}): Promise<Buffer> {
  const { data, type, potxBuffer, mapping } = args

  const { buffer: visualsBuffer, order } = await renderVisualSlides(type, data, mapping.visualSplice)
  const composed = await composePptx({ type, potxBuffer, visualsBuffer, visualOrder: order, mapping })

  const doc = new Docxtemplater(new PizZip(composed), { paragraphLoop: true, linebreaks: true })
  doc.render(buildTemplateData(data, data.branding.companyName))
  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
}
