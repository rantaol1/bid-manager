/**
 * Helpers for the free-text proposal narrative fields (understanding,
 * commercialModel, recommendation). These store HTML produced by the TipTap
 * `RichTextEditor`, but older opportunities (and "insert standard text"
 * snippets) hold plain text with `\n` line breaks. Everything that renders a
 * narrative field — the slide preview and the PPTX builders — runs the stored
 * value through `toRenderHtml()` first so both formats behave identically.
 */

const HTML_TAG = /<\/?[a-z][\s\S]*?>/i

/** True when the stored value already contains HTML markup. */
export function isRichHtml(value: string): boolean {
  return HTML_TAG.test(value)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Convert legacy plain text into paragraphs, preserving blank lines/breaks. */
export function plainTextToHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/)
  return blocks
    .map((block) => {
      const inner = block
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br>')
      return `<p>${inner || '<br>'}</p>`
    })
    .join('')
}

/** Strip a handful of unsafe constructs from stored/authored HTML. */
export function sanitizeRichHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2')
}

/** Normalise any stored narrative value to safe HTML ready for rendering. */
export function toRenderHtml(value: string | null | undefined): string {
  if (!value) return ''
  const html = isRichHtml(value) ? value : plainTextToHtml(value)
  return sanitizeRichHtml(html)
}

/** True when a narrative value has no visible text content. */
export function richTextIsEmpty(value: string | null | undefined): boolean {
  if (!value) return true
  return !value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
}
