import JSZip from 'jszip'

export interface ParsedSlide {
  /** 1-based position in presentation order (what pptx-automizer.addSlide expects). */
  index: number
  /** First text on the slide, for the mapping UI. */
  title: string
  /** Distinct `{placeholder}` / `{#loop}` tokens found on the slide. */
  tokens: string[]
  /** Whether the slide contains a table (where row-loops must live). */
  hasTable: boolean
}

const TOKEN_RE = /\{[#/^]?\s*[\w.]+\s*\}/g

/** Concatenated visible text of a slide (a:t runs joined), so tokens split across
 *  runs are still detected. */
function slideText(xml: string): string {
  const out: string[] = []
  const re = /<a:t>([\s\S]*?)<\/a:t>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    out.push(
      m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    )
  }
  return out.join('')
}

/** Read slide part targets in presentation order (sldIdLst -> rels -> slide parts). */
async function slidesInOrder(zip: JSZip): Promise<string[]> {
  const presXml = (await zip.file('ppt/presentation.xml')?.async('string')) ?? ''
  const relsXml = (await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')) ?? ''

  const relMap = new Map<string, string>()
  const relRe = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g
  let r: RegExpExecArray | null
  while ((r = relRe.exec(relsXml))) {
    const target = r[2].replace(/^\.\.\//, '').replace(/^\//, '')
    relMap.set(r[1], target.startsWith('ppt/') ? target : `ppt/${target}`)
  }

  const order: string[] = []
  const sldRe = /<p:sldId\b[^>]*r:id="([^"]+)"/g
  let s: RegExpExecArray | null
  while ((s = sldRe.exec(presXml))) {
    const part = relMap.get(s[1])
    if (part && zip.file(part)) order.push(part)
  }

  // Fallback: if presentation order couldn't be read, use numeric filename order.
  if (order.length === 0) {
    return Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(a.match(/slide(\d+)/)![1]) - Number(b.match(/slide(\d+)/)![1]))
  }
  return order
}

/** Parse the slide inventory of a (normalized) pptx buffer for the mapping UI. */
export async function parsePptxSlides(buffer: Buffer): Promise<ParsedSlide[]> {
  const zip = await JSZip.loadAsync(buffer)
  const parts = await slidesInOrder(zip)
  const slides: ParsedSlide[] = []

  for (let i = 0; i < parts.length; i++) {
    const xml = (await zip.file(parts[i])?.async('string')) ?? ''
    const text = slideText(xml)
    const tokens = Array.from(new Set(text.match(TOKEN_RE) ?? [])).map((t) => t.replace(/\s+/g, ''))
    const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? ''
    slides.push({
      index: i + 1,
      title: firstLine.slice(0, 80),
      tokens,
      hasTable: /<a:tbl[ >]/.test(xml),
    })
  }
  return slides
}
