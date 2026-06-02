import type pptxgen from 'pptxgenjs'
import { BRAND, SLIDE, addSectionLabel, addTitle, addFooter } from './branding'

/** Auto-generated table of contents listing the included section titles. */
export function addContentsSlide(pptx: pptxgen, titles: string[], slideNumber: number) {
  const slide = pptx.addSlide()
  slide.background = { color: BRAND.white }
  addSectionLabel(slide, 'Contents')
  addTitle(slide, 'What this proposal covers')

  // Split into up to two columns for long lists.
  const half = Math.ceil(titles.length / 2)
  const columns = titles.length > 10 ? [titles.slice(0, half), titles.slice(half)] : [titles]
  const colW = columns.length === 2 ? 4.35 : SLIDE.contentW

  columns.forEach((col, ci) => {
    const startIndex = ci * half
    slide.addText(
      col.map((t, i) => ({
        text: `${startIndex + i + 1}.  ${t}`,
        options: { breakLine: true },
      })),
      {
        x: SLIDE.margin + ci * (colW + 0.3),
        y: 1.5,
        w: colW,
        h: 3.4,
        fontFace: BRAND.font,
        fontSize: 12,
        color: BRAND.darkGray,
        valign: 'top',
        paraSpaceAfter: 7,
      }
    )
  })

  addFooter(slide, slideNumber)
  return slide
}
