import type pptxgen from 'pptxgenjs'
import {
  addMonths,
  differenceInCalendarMonths,
  getDate,
  getDaysInMonth,
  startOfMonth,
  format,
} from 'date-fns'
import type { LoadedEstimation } from '@/lib/estimation-data'

export const PPTX_BRAND = {
  magenta: 'E6007E',
  black: '1A1A1A',
  grey: 'F2F2F2',
  white: 'FFFFFF',
  green: '2EB872',
}

const ROLLOUT_FALLBACK = ['E87722', '2196F3', '2EB872', '9C27B0']

export function titleSlide(pptx: pptxgen, title: string, subtitle: string, dateStr: string) {
  const slide = pptx.addSlide()
  slide.background = { color: PPTX_BRAND.white }
  slide.addText('ARCWIDE', { x: 0.5, y: 1.4, w: 9, h: 0.6, fontFace: 'Arial', fontSize: 28, bold: true, color: PPTX_BRAND.magenta })
  slide.addText(title, { x: 0.5, y: 2.1, w: 9, h: 0.9, fontFace: 'Arial', fontSize: 40, bold: true, color: PPTX_BRAND.black })
  slide.addText(subtitle, { x: 0.5, y: 3.0, w: 9, h: 0.5, fontFace: 'Arial', fontSize: 22, color: PPTX_BRAND.black })
  slide.addText(dateStr, { x: 0.5, y: 3.6, w: 9, h: 0.4, fontFace: 'Arial', fontSize: 14, color: '666666' })
  return slide
}

export function contentSlide(pptx: pptxgen, title: string) {
  const slide = pptx.addSlide()
  slide.background = { color: PPTX_BRAND.white }
  slide.addText(title, { x: 0.5, y: 0.3, w: 9, h: 0.6, fontFace: 'Arial', fontSize: 26, bold: true, color: PPTX_BRAND.magenta })
  return slide
}

/** Render a chevron roadmap onto a slide using PowerPoint shapes. */
export function addRoadmap(pptx: pptxgen, slide: pptxgen.Slide, estimation: LoadedEstimation) {
  const phases = estimation.rollouts.flatMap((ro, laneIndex) =>
    ro.phases.map((ph, i) => ({
      name: ph.name,
      start: new Date(ph.startDate),
      end: new Date(ph.endDate),
      colour: ro.colour || ROLLOUT_FALLBACK[laneIndex % ROLLOUT_FALLBACK.length],
      lane: laneIndex,
      isFirst: i === 0,
      goLives: ph.goLives.map((d) => new Date(d)),
    }))
  )
  const valid = phases.filter((p) => !isNaN(p.start.getTime()) && !isNaN(p.end.getTime()))
  if (valid.length === 0) {
    slide.addText('No phases to display.', { x: 0.5, y: 2.5, w: 9, h: 0.5, fontFace: 'Arial', fontSize: 16, color: '666666' })
    return
  }

  let min = valid[0].start
  let max = valid[0].end
  for (const p of valid) {
    if (p.start < min) min = p.start
    if (p.end > max) max = p.end
  }
  const axisStart = startOfMonth(min)
  const totalMonths = Math.max(1, differenceInCalendarMonths(max, axisStart) + 1)

  const chartX = 0.5
  const chartW = 9.0
  const inPerMonth = chartW / totalMonths
  const topY = 1.5
  const laneHeight = 0.55
  const barH = 0.4
  const lanes = estimation.rollouts.length

  // Month labels
  for (let i = 0; i < totalMonths; i++) {
    const m = addMonths(axisStart, i)
    slide.addText(format(m, 'MMM yy'), {
      x: chartX + i * inPerMonth,
      y: 1.05,
      w: inPerMonth,
      h: 0.3,
      fontFace: 'Arial',
      fontSize: 8,
      color: '666666',
      align: 'center',
    })
  }

  function offsetIn(date: Date) {
    const monthsFromStart = differenceInCalendarMonths(date, axisStart)
    const dayFraction = (getDate(date) - 1) / getDaysInMonth(date)
    return (monthsFromStart + dayFraction) * inPerMonth
  }

  for (const p of valid) {
    const left = chartX + offsetIn(p.start)
    const right = chartX + offsetIn(p.end)
    const w = Math.max(0.4, right - left)
    const y = topY + p.lane * laneHeight
    slide.addShape(pptx.ShapeType.chevron, {
      x: left,
      y,
      w,
      h: barH,
      fill: { color: p.colour },
      line: { color: p.colour, width: 0 },
    })
    slide.addText(p.name, {
      x: left,
      y,
      w,
      h: barH,
      fontFace: 'Arial',
      fontSize: 9,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    })
    // Go-live diamonds at start of month
    for (const gl of p.goLives) {
      const glLeft = chartX + differenceInCalendarMonths(startOfMonth(gl), axisStart) * inPerMonth
      slide.addShape(pptx.ShapeType.diamond, {
        x: glLeft - 0.08,
        y: y + barH / 2 - 0.08,
        w: 0.16,
        h: 0.16,
        fill: { color: PPTX_BRAND.green },
        line: { color: 'FFFFFF', width: 1 },
      })
    }
  }

  // Legend
  let legendX = chartX
  const legendY = topY + lanes * laneHeight + 0.3
  for (const ro of estimation.rollouts) {
    slide.addShape(pptx.ShapeType.rect, { x: legendX, y: legendY, w: 0.18, h: 0.18, fill: { color: ro.colour } })
    slide.addText(ro.name, { x: legendX + 0.25, y: legendY - 0.04, w: 2.2, h: 0.3, fontFace: 'Arial', fontSize: 10, color: PPTX_BRAND.black })
    legendX += 2.6
  }
}
