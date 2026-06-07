import JSZip from 'jszip'

export interface ExtractedSnippet {
  heading: string
  text: string
}

export interface ExtractedContent {
  text: string
  snippets: ExtractedSnippet[]
}

/** Strip XML tags and decode the handful of entities Office uses. */
function xmlToText(xml: string, paragraphTag: RegExp): string[] {
  // Split into paragraph-ish chunks first so we keep line structure.
  const paras = xml.split(paragraphTag)
  return paras
    .map((p) =>
      p
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((line) => line.length > 0)
}

/**
 * Extract plain text + naive snippets from an uploaded .docx or .pptx buffer.
 * docx/pptx are ZIP archives; we read the relevant XML parts and strip markup.
 * (We can't reproduce layout/branding — this is text-content extraction only.)
 */
export async function extractText(buffer: Buffer, docType: 'docx' | 'pptx'): Promise<ExtractedContent> {
  const zip = await JSZip.loadAsync(buffer)
  const lines: string[] = []

  if (docType === 'docx') {
    const doc = zip.file('word/document.xml')
    if (doc) lines.push(...xmlToText(await doc.async('string'), /<w:p[ >]/))
  } else {
    // Slides are ppt/slides/slide1.xml, slide2.xml, … — keep them in order.
    const slideFiles = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0)
        const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0)
        return na - nb
      })
    for (const name of slideFiles) {
      const f = zip.file(name)
      if (f) lines.push(...xmlToText(await f.async('string'), /<a:p>/))
    }
  }

  const text = lines.join('\n')

  // Naive snippet grouping: a short line (likely a heading) starts a new snippet;
  // following longer lines are its body.
  const snippets: ExtractedSnippet[] = []
  let current: ExtractedSnippet | null = null
  for (const line of lines) {
    const isHeading = line.length <= 60 && !line.endsWith('.')
    if (isHeading) {
      if (current) snippets.push(current)
      current = { heading: line, text: '' }
    } else if (current) {
      current.text = current.text ? `${current.text}\n${line}` : line
    } else {
      current = { heading: line.slice(0, 60), text: line }
    }
  }
  if (current) snippets.push(current)

  return { text, snippets: snippets.filter((s) => s.text || s.heading).slice(0, 100) }
}
