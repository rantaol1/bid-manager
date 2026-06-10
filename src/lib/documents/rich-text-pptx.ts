import type pptxgen from 'pptxgenjs'
import { toRenderHtml } from '@/lib/rich-text'

/**
 * Convert the HTML stored in a free-text narrative field into pptxgenjs text
 * runs, preserving bold/italic/underline/colour, bullet & numbered lists,
 * paragraph styles and line breaks. Runs PPTX-side (Node, no DOM), so it uses a
 * small tokenizer tuned to the limited tag set the `RichTextEditor` emits:
 * p, h2, h3, br, strong/b, em/i, u, s, span[style*=color], ul/ol/li.
 *
 * The output is an array suitable for `slide.addText(runs, frameOpts)`; colour
 * and font size are only set on runs that need to override the frame defaults.
 */

interface Marks {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
}
type Run = { text: string; marks: Marks }
type Block = { kind: 'p' | 'h2' | 'h3'; listType?: 'bullet' | 'number'; depth: number; runs: Run[] }

interface ConvertOpts {
  /** Base font size (points) for body paragraphs. Headings scale up from this. */
  fontSize?: number
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code] ?? m
  })
}

/** Normalise a CSS colour (hex / rgb()) to a 6-digit uppercase hex, or undefined. */
function normaliseColor(raw: string): string | undefined {
  const v = raw.trim().toLowerCase()
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hex) {
    const h = hex[1]
    return (h.length === 3 ? h.split('').map((c) => c + c).join('') : h).toUpperCase()
  }
  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]]
      .map((n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }
  return undefined
}

function colorFromStyle(attrs: string): string | undefined {
  const style = attrs.match(/style\s*=\s*("([^"]*)"|'([^']*)')/i)
  if (!style) return undefined
  const decl = (style[2] ?? style[3] ?? '').match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
  return decl ? normaliseColor(decl[1]) : undefined
}

/** Parse the HTML into a flat list of blocks with inline runs. */
function parseBlocks(html: string): Block[] {
  const blocks: Block[] = []
  const listStack: Array<'bullet' | 'number'> = []
  const colorStack: string[] = []
  let bold = 0
  let italic = 0
  let underline = 0
  let block: Block | null = null

  const openBlock = (kind: Block['kind']) => {
    flush()
    block = {
      kind,
      listType: listStack.length ? listStack[listStack.length - 1] : undefined,
      depth: listStack.length ? listStack.length - 1 : 0,
      runs: [],
    }
  }
  const flush = () => {
    if (!block) return
    // Trim outer whitespace; keep intentionally-empty paragraphs as blank lines.
    const runs = block.runs
    if (runs.length) {
      runs[0].text = runs[0].text.replace(/^\s+/, '')
      runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '')
    }
    const hasText = runs.some((r) => r.text.length)
    const keepEmpty = !block.listType && block.kind === 'p'
    if (hasText || keepEmpty) blocks.push(block)
    block = null
  }
  const addText = (raw: string) => {
    const text = decodeEntities(raw).replace(/\s+/g, ' ')
    if (!text) return
    if (!block) openBlock('p')
    block!.runs.push({
      text,
      marks: {
        bold: bold > 0 || undefined,
        italic: italic > 0 || undefined,
        underline: underline > 0 || undefined,
        color: colorStack.length ? colorStack[colorStack.length - 1] : undefined,
      },
    })
  }

  const token = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = token.exec(html))) {
    const [, closing, rawTag, attrs, text] = m
    if (text !== undefined) {
      addText(text)
      continue
    }
    if (!rawTag) continue // comment
    const tag = rawTag.toLowerCase()
    const isClose = closing === '/'
    switch (tag) {
      case 'strong':
      case 'b':
        bold += isClose ? -1 : 1
        break
      case 'em':
      case 'i':
        italic += isClose ? -1 : 1
        break
      case 'u':
      case 'ins':
        underline += isClose ? -1 : 1
        break
      case 'span':
        if (isClose) {
          if (colorStack.length) colorStack.pop()
        } else {
          // Always push so the matching close pops symmetrically.
          colorStack.push(colorFromStyle(attrs) ?? colorStack[colorStack.length - 1] ?? '')
        }
        break
      case 'ul':
      case 'ol':
        if (isClose) listStack.pop()
        else listStack.push(tag === 'ol' ? 'number' : 'bullet')
        break
      case 'p':
      case 'h2':
      case 'h3':
        if (isClose) flush()
        else openBlock(tag as Block['kind'])
        break
      case 'li':
        // TipTap wraps li content in <p>; opening the li just primes list ctx.
        if (isClose) flush()
        break
      case 'br': {
        // End the current line and continue the same block kind/list context.
        const b = block as Block | null
        if (b) {
          const kind = b.kind
          flush()
          openBlock(kind)
        }
        break
      }
      default:
        break
    }
  }
  flush()
  // Drop a leading/trailing fully-empty paragraph (artifacts of trimming).
  return blocks
}

const clean = (c?: string) => (c ? c.replace(/^#/, '').toUpperCase() : undefined)

/** Build pptxgenjs text runs from stored narrative HTML/plain text. */
export function richTextToPptxRuns(
  value: string | null | undefined,
  opts: ConvertOpts = {}
): pptxgen.TextProps[] {
  const html = toRenderHtml(value)
  const blocks = parseBlocks(html)
  const base = opts.fontSize ?? 12
  const runs: pptxgen.TextProps[] = []

  for (const b of blocks) {
    const headingSize = b.kind === 'h2' ? Math.round(base + 4) : b.kind === 'h3' ? Math.round(base + 2) : undefined
    const headingBold = b.kind === 'h2' || b.kind === 'h3'
    const items = b.runs.length ? b.runs : [{ text: '', marks: {} as Marks }]

    items.forEach((r, i) => {
      const options: pptxgen.TextPropsOptions = {}
      if (r.marks.bold || headingBold) options.bold = true
      if (r.marks.italic) options.italic = true
      if (r.marks.underline) options.underline = { style: 'sng' }
      const color = clean(r.marks.color)
      if (color) options.color = color
      if (headingSize) options.fontSize = headingSize

      // First run carries paragraph-level props (bullet / indent).
      if (i === 0) {
        if (b.listType) {
          options.bullet =
            b.listType === 'number'
              ? { type: 'number', indent: 18 }
              : { characterCode: '2022', indent: 18 }
          if (b.depth > 0) options.indentLevel = b.depth
        }
        if (headingBold) options.paraSpaceBefore = 4
      }
      // Last run ends the paragraph.
      if (i === items.length - 1) options.breakLine = true

      runs.push({ text: r.text, options })
    })
  }

  return runs.length ? runs : [{ text: '', options: { breakLine: true } }]
}
