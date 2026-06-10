'use client'

import { toRenderHtml, richTextIsEmpty } from '@/lib/rich-text'

/**
 * Renders a free-text narrative field (understanding / commercialModel /
 * recommendation) in the slide preview. Legacy plain text is normalised to
 * paragraphs first, so line breaks and lists show up exactly as they will in
 * the generated PPTX. When the field is empty a muted placeholder is shown.
 */
export function RichTextView({
  value,
  placeholder,
  fontSize = 12,
  color,
  lineHeight = 1.35,
}: {
  value: string | null | undefined
  placeholder?: string
  fontSize?: number
  color?: string
  lineHeight?: number
}) {
  if (richTextIsEmpty(value)) {
    return (
      <div style={{ fontSize, color: color ?? '#666666', fontStyle: 'italic', lineHeight }}>
        {placeholder ?? ''}
      </div>
    )
  }
  return (
    <div
      style={{ fontSize, color, lineHeight }}
      className={[
        '[&_p]:my-1 [&_:first-child]:mt-0 [&_:last-child]:mb-0',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5',
        '[&_h2]:font-bold [&_h2]:text-[1.3em] [&_h3]:font-semibold [&_h3]:text-[1.15em] [&_h2]:my-1 [&_h3]:my-1',
        '[&_strong]:font-bold [&_em]:italic [&_u]:underline',
      ].join(' ')}
      // Content is TipTap-authored and passed through sanitizeRichHtml().
      dangerouslySetInnerHTML={{ __html: toRenderHtml(value) }}
    />
  )
}
