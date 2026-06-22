import type pptxgen from 'pptxgenjs'

/**
 * Arcwide proposal visual identity. pptxgenjs LAYOUT_16x9 is a 10 x 5.625 inch
 * canvas; all coordinates here assume that. (The legacy pptx-helpers.ts uses the
 * same canvas, so addRoadmap() composes cleanly with these slides.)
 */
export const BRAND = {
  magenta: 'E6007E',
  /** Customer-side accent for the project-organisation chart (approx the image's purple). */
  purple: '7A2B8E',
  black: '1A1A1A',
  white: 'FFFFFF',
  darkGray: '333333',
  midGray: '666666',
  lightGray: 'F2F2F2',
  rowGray: 'F7F7F7',
  border: 'D9D9D9',
  font: 'Arial',
}

export const SLIDE = { w: 10, h: 5.625, margin: 0.5, contentW: 9.0 }
const FOOTER_Y = 5.32

const DEFAULT_FOOTER = 'ARCWIDE  ·  IFS CLOUD IMPLEMENTATION PROPOSAL'
let footerOverride: string | null = null
/** Set the per-document footer text (call once before building a deck). */
export function setProposalFooter(text: string | null | undefined) {
  footerOverride = text?.trim() ? text.trim() : null
}

type Cell = { text: string; options?: pptxgen.TextPropsOptions }

/** Decorative magenta squares in the top-right corner. */
export function addMagentaSquares(slide: pptxgen.Slide) {
  const sq = 0.16
  const gap = 0.06
  const startX = SLIDE.w - SLIDE.margin - (sq * 3 + gap * 2)
  const startY = 0.32
  const pattern = [
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 0],
  ]
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (!pattern[r][c]) continue
      slide.addShape('rect', {
        x: startX + c * (sq + gap),
        y: startY + r * (sq + gap),
        w: sq,
        h: sq,
        fill: { color: BRAND.magenta },
        line: { type: 'none' },
      })
    }
  }
}

/** Footer band: wordmark left, slide number right. Content slides only. */
export function addFooter(slide: pptxgen.Slide, slideNumber: number) {
  slide.addText(footerOverride ?? DEFAULT_FOOTER, {
    x: SLIDE.margin,
    y: FOOTER_Y,
    w: 7,
    h: 0.25,
    fontFace: BRAND.font,
    fontSize: 8,
    color: BRAND.midGray,
  })
  slide.addText(String(slideNumber), {
    x: SLIDE.w - SLIDE.margin - 0.5,
    y: FOOTER_Y,
    w: 0.5,
    h: 0.25,
    fontFace: BRAND.font,
    fontSize: 8,
    color: BRAND.midGray,
    align: 'right',
  })
}

/** Small-caps magenta section label with a leading square. */
export function addSectionLabel(slide: pptxgen.Slide, label: string) {
  slide.addShape('rect', { x: SLIDE.margin, y: 0.42, w: 0.12, h: 0.12, fill: { color: BRAND.magenta }, line: { type: 'none' } })
  slide.addText(label.toUpperCase(), {
    x: SLIDE.margin + 0.22,
    y: 0.34,
    w: 7,
    h: 0.3,
    fontFace: BRAND.font,
    fontSize: 9,
    color: BRAND.magenta,
    bold: true,
    charSpacing: 2,
  })
}

/** Bold black slide title. */
export function addTitle(slide: pptxgen.Slide, title: string) {
  slide.addText(title, {
    x: SLIDE.margin,
    y: 0.72,
    w: SLIDE.contentW,
    h: 0.55,
    fontFace: BRAND.font,
    fontSize: 22,
    bold: true,
    color: BRAND.black,
  })
}

/** Create a standard white content slide with section label, title and footer. */
export function contentSlide(pptx: pptxgen, opts: { label: string; title: string; slideNumber: number }) {
  const slide = pptx.addSlide()
  slide.background = { color: BRAND.white }
  addSectionLabel(slide, opts.label)
  addTitle(slide, opts.title)
  addFooter(slide, opts.slideNumber)
  return slide
}

/** A branded table: magenta header row, alternating light-gray body rows. */
export function brandedTable(
  slide: pptxgen.Slide,
  headers: string[],
  rows: string[][],
  opts: { x?: number; y: number; w?: number; colW?: number[]; fontSize?: number; h?: number }
) {
  const fontSize = opts.fontSize ?? 11
  const headerRow: Cell[] = headers.map((h) => ({
    text: h,
    options: { fill: { color: BRAND.magenta }, color: BRAND.white, bold: true, fontSize, fontFace: BRAND.font, valign: 'middle' },
  }))
  const bodyRows: Cell[][] = rows.map((r, i) =>
    r.map((c) => ({
      text: c,
      options: {
        fill: { color: i % 2 === 0 ? BRAND.white : BRAND.rowGray },
        color: BRAND.darkGray,
        fontSize,
        fontFace: BRAND.font,
        valign: 'middle',
      },
    }))
  )
  slide.addTable([headerRow, ...bodyRows], {
    x: opts.x ?? SLIDE.margin,
    y: opts.y,
    w: opts.w ?? SLIDE.contentW,
    colW: opts.colW,
    rowH: opts.h,
    border: { type: 'solid', pt: 0.5, color: BRAND.border },
    fontFace: BRAND.font,
    autoPage: false,
  })
}

/** Bulleted text block. */
export function addBullets(
  slide: pptxgen.Slide,
  items: string[],
  opts: { x?: number; y: number; w?: number; h?: number; fontSize?: number; color?: string }
) {
  if (items.length === 0) return
  slide.addText(
    items.map((t) => ({ text: t, options: { bullet: { code: '2022', indent: 14 }, breakLine: true } })),
    {
      x: opts.x ?? SLIDE.margin,
      y: opts.y,
      w: opts.w ?? SLIDE.contentW,
      h: opts.h ?? 3.5,
      fontFace: BRAND.font,
      fontSize: opts.fontSize ?? 13,
      color: opts.color ?? BRAND.darkGray,
      valign: 'top',
      paraSpaceAfter: 6,
    }
  )
}

/** A horizontal flow of numbered steps (magenta circles + label). */
export function addNumberedSteps(
  slide: pptxgen.Slide,
  steps: string[],
  opts: { y: number; h?: number }
) {
  if (steps.length === 0) return
  const n = steps.length
  const gap = 0.25
  const totalW = SLIDE.contentW
  const cardW = (totalW - gap * (n - 1)) / n
  const h = opts.h ?? 1.8
  steps.forEach((step, i) => {
    const x = SLIDE.margin + i * (cardW + gap)
    slide.addShape('roundRect', {
      x,
      y: opts.y,
      w: cardW,
      h,
      fill: { color: BRAND.lightGray },
      line: { type: 'none' },
      rectRadius: 0.06,
    })
    slide.addShape('ellipse', { x: x + 0.15, y: opts.y + 0.15, w: 0.4, h: 0.4, fill: { color: BRAND.magenta }, line: { type: 'none' } })
    slide.addText(String(i + 1), {
      x: x + 0.15,
      y: opts.y + 0.15,
      w: 0.4,
      h: 0.4,
      fontFace: BRAND.font,
      fontSize: 14,
      bold: true,
      color: BRAND.white,
      align: 'center',
      valign: 'middle',
    })
    slide.addText(step, {
      x: x + 0.12,
      y: opts.y + 0.6,
      w: cardW - 0.24,
      h: h - 0.7,
      fontFace: BRAND.font,
      fontSize: 10,
      color: BRAND.darkGray,
      valign: 'top',
    })
  })
}

/** A grid of titled cards (title bold + description). */
export function addCards(
  slide: pptxgen.Slide,
  cards: Array<{ title: string; description: string }>,
  opts: { y: number; cols?: number; h?: number; rowGap?: number }
) {
  if (cards.length === 0) return
  const cols = opts.cols ?? Math.min(cards.length, 4)
  const gap = 0.25
  const rowGap = opts.rowGap ?? 0.25
  const cardW = (SLIDE.contentW - gap * (cols - 1)) / cols
  const cardH = opts.h ?? 1.6
  cards.forEach((card, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = SLIDE.margin + col * (cardW + gap)
    const y = opts.y + row * (cardH + rowGap)
    slide.addShape('roundRect', { x, y, w: cardW, h: cardH, fill: { color: BRAND.lightGray }, line: { type: 'none' }, rectRadius: 0.06 })
    slide.addShape('rect', { x, y, w: 0.08, h: cardH, fill: { color: BRAND.magenta }, line: { type: 'none' } })
    slide.addText(card.title, {
      x: x + 0.2,
      y: y + 0.12,
      w: cardW - 0.32,
      h: 0.4,
      fontFace: BRAND.font,
      fontSize: 12,
      bold: true,
      color: BRAND.black,
      valign: 'top',
    })
    slide.addText(card.description, {
      x: x + 0.2,
      y: y + 0.52,
      w: cardW - 0.32,
      h: cardH - 0.62,
      fontFace: BRAND.font,
      fontSize: 9.5,
      color: BRAND.darkGray,
      valign: 'top',
    })
  })
}

/** Empty-state helper for slides whose data is missing. */
export function addPlaceholder(slide: pptxgen.Slide, message: string, y = 2.4) {
  slide.addText(message, {
    x: SLIDE.margin,
    y,
    w: SLIDE.contentW,
    h: 0.5,
    fontFace: BRAND.font,
    fontSize: 12,
    italic: true,
    color: BRAND.midGray,
  })
}
