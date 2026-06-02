import type pptxgen from 'pptxgenjs'
import { BRAND, SLIDE, addMagentaSquares } from './branding'

export interface DividerOptions {
  number: string
  title: string
  subtitle?: string
}

/** Dark chapter divider: large magenta number, white title, ARCWIDE wordmark. */
export function addDividerSlide(pptx: pptxgen, opts: DividerOptions) {
  const slide = pptx.addSlide()
  slide.background = { color: BRAND.black }
  addMagentaSquares(slide)

  slide.addText(opts.number, {
    x: SLIDE.margin,
    y: 1.4,
    w: 3,
    h: 1.6,
    fontFace: BRAND.font,
    fontSize: 96,
    bold: true,
    color: BRAND.magenta,
    valign: 'middle',
  })
  slide.addText(opts.title, {
    x: SLIDE.margin,
    y: 3.0,
    w: 8.5,
    h: 0.8,
    fontFace: BRAND.font,
    fontSize: 30,
    bold: true,
    color: BRAND.white,
  })
  if (opts.subtitle) {
    slide.addText(opts.subtitle, {
      x: SLIDE.margin,
      y: 3.8,
      w: 8.5,
      h: 0.5,
      fontFace: BRAND.font,
      fontSize: 14,
      color: 'CCCCCC',
    })
  }
  slide.addText('ARCWIDE', {
    x: SLIDE.w - SLIDE.margin - 2.5,
    y: SLIDE.h - 0.55,
    w: 2.5,
    h: 0.35,
    fontFace: BRAND.font,
    fontSize: 14,
    bold: true,
    color: BRAND.white,
    align: 'right',
  })
  return slide
}
