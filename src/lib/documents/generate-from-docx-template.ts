import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { getFileBuffer } from '@/lib/storage'
import { loadProposalData } from '@/lib/documents/proposal-data'
import { buildTemplateData } from '@/lib/templates/placeholder-schema'

/**
 * Fill a user-uploaded .docx template's {placeholders} with opportunity data,
 * preserving the template's Word formatting/branding. Returns the rendered .docx.
 */
export async function generateFromDocxTemplate(args: {
  opportunityId: string
  templateUrl: string
  companyName: string
}): Promise<Buffer> {
  const templateBuf = await getFileBuffer(args.templateUrl)
  if (!templateBuf) throw new Error('Template file not found')

  const data = await loadProposalData(args.opportunityId)
  if (!data) throw new Error('Opportunity not found')

  const zip = new PizZip(templateBuf)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
  doc.render(buildTemplateData(data, args.companyName))

  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
}
