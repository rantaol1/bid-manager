import PizZip from 'pizzip'

const TEMPLATE_CT = 'application/vnd.openxmlformats-officedocument.presentationml.template.main+xml'
const PRESENTATION_CT = 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'

/**
 * A `.potx` is structurally a `.pptx` zip, but its main part is declared with the
 * "template" content-type, which docxtemplater/pptx-automizer don't recognise as a
 * presentation. Rewrite `[Content_Types].xml` so the file behaves as a `.pptx`, and
 * return the normalized buffer. A real `.pptx` passes through unchanged.
 */
export function normalizePotxBuffer(buffer: Buffer): { buffer: Buffer; wasNormalized: boolean } {
  const zip = new PizZip(buffer)
  const ctFile = zip.file('[Content_Types].xml')
  if (!ctFile) throw new Error('Not a valid Office Open XML file (missing [Content_Types].xml)')

  const ct = ctFile.asText()
  if (!ct.includes(TEMPLATE_CT)) {
    // Already a presentation (or no template declaration) — nothing to do.
    return { buffer, wasNormalized: false }
  }

  zip.file('[Content_Types].xml', ct.split(TEMPLATE_CT).join(PRESENTATION_CT))
  const out = zip.generate({ type: 'nodebuffer' }) as Buffer

  // Sanity check the rewrite succeeded before callers persist it.
  const check = new PizZip(out).file('[Content_Types].xml')?.asText() ?? ''
  if (check.includes(TEMPLATE_CT) || !check.includes(PRESENTATION_CT)) {
    throw new Error('Failed to normalize .potx content type')
  }
  return { buffer: out, wasNormalized: true }
}
