import type pptxgen from 'pptxgenjs'
import { BRAND, SLIDE, addMagentaSquares } from './branding'

export interface CoverOptions {
  title: string
  customer: string
  subtitle: string
  dateStr: string
  version: number
}

/** Dark cover slide: title, customer, subtitle, ARCWIDE wordmark, magenta squares. */
export function addCoverSlide(pptx: pptxgen, opts: CoverOptions) {
  const slide = pptx.addSlide()
  slide.background = { color: BRAND.black }
  addMagentaSquares(slide)

  // magenta accent bar
  slide.addShape('rect', { x: SLIDE.margin, y: 2.0, w: 1.4, h: 0.08, fill: { color: BRAND.magenta }, line: { type: 'none' } })

  slide.addText(opts.title, {
    x: SLIDE.margin,
    y: 2.2,
    w: 8.5,
    h: 1.2,
    fontFace: BRAND.font,
    fontSize: 34,
    bold: true,
    color: BRAND.white,
    valign: 'top',
  })
  slide.addText(opts.customer, {
    x: SLIDE.margin,
    y: 3.45,
    w: 8.5,
    h: 0.5,
    fontFace: BRAND.font,
    fontSize: 20,
    color: BRAND.magenta,
  })
  slide.addText(opts.subtitle, {
    x: SLIDE.margin,
    y: 3.95,
    w: 8.5,
    h: 0.4,
    fontFace: BRAND.font,
    fontSize: 13,
    color: 'CCCCCC',
  })
  slide.addText(`${opts.dateStr}   ·   Version ${opts.version}`, {
    x: SLIDE.margin,
    y: 4.4,
    w: 6,
    h: 0.35,
    fontFace: BRAND.font,
    fontSize: 11,
    color: BRAND.midGray,
  })

  slide.addText('ARCWIDE', {
    x: SLIDE.w - SLIDE.margin - 2.5,
    y: SLIDE.h - 0.55,
    w: 2.5,
    h: 0.35,
    fontFace: BRAND.font,
    fontSize: 16,
    bold: true,
    color: BRAND.white,
    align: 'right',
  })
  return slide
}
