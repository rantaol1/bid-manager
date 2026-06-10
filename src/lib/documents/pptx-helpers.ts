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
import {
  DEFAULT_ROADMAP_BG,
  gridColor,
  dividerColor,
  axisTextColor,
  axisSubTextColor,
  cardBorderColor,
  lighten,
  yearGroups,
} from '@/lib/roadmap-style'

export const PPTX_BRAND = {
  magenta: 'E6007E',
  black: '1A1A1A',
  grey: 'F2F2F2',
  white: 'FFFFFF',
  green: '2EB872',
}

const ROLLOUT_FALLBACK = ['E87722', '2196F3', '2EB872', '9C27B0']

/** pptxgenjs wants bare hex (no leading '#'); colours are stored as '#E87722'. */
const hex = (color: string) => color.replace(/^#/, '')

/** Pick a chevron label font size (pt) that fits the available bar width. */
function fitFontSize(text: string, widthIn: number, max = 10, min = 6) {
  const avail = Math.max(0.1, widthIn - 0.34) // inset past both chevron notches
  const perChar = 0.0072 // ≈ inches per pt per char, Arial bold
  const size = avail / (Math.max(1, text.length) * perChar)
  return Math.max(min, Math.min(max, Math.round(size)))
}

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
      id: ph.id,
      name: ph.name,
      start: new Date(ph.startDate),
      end: new Date(ph.endDate),
      // Per-phase colour override wins over the rollout colour, mirroring the web roadmap.
      colour: ph.colour || ro.colour || ROLLOUT_FALLBACK[laneIndex % ROLLOUT_FALLBACK.length],
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
  const months = Array.from({ length: totalMonths }, (_, i) => addMonths(axisStart, i))
  const groups = yearGroups(months)

  const lanes = estimation.rollouts.length
  const chartX = 0.6
  const chartW = 8.8
  const inPerMonth = chartW / totalMonths
  // Use the available vertical space: taller lanes when there are few rollouts.
  const laneHeight = lanes <= 2 ? 0.95 : lanes <= 4 ? 0.75 : 0.6
  const barH = Math.min(0.55, laneHeight * 0.58)

  const offsetIn = (date: Date) =>
    (differenceInCalendarMonths(date, axisStart) + (getDate(date) - 1) / getDaysInMonth(date)) * inPerMonth

  // Group brackets — mirror the web roadmap: bands overlay BELOW the lanes (no
  // reserved strip above). Web offsets are pixels on a 56px lane, scaled to the
  // slide's lane height; legacy out-of-range offsets heal to the default.
  const WEB_LANE = 56
  const WEB_GROUP_ROW = 26
  const WEB_GROUP_BAND = 18
  const WEB_GROUP_GAP = 6
  const pxToIn = laneHeight / WEB_LANE
  const GROUP_BAND_IN = WEB_GROUP_BAND * pxToIn
  const phaseById = new Map(valid.map((p) => [p.id, p]))
  const groupBandData = estimation.groups.map((g) => {
    const members = g.phaseIds
      .map((pid) => phaseById.get(pid))
      .filter((p): p is (typeof valid)[number] => Boolean(p))
    if (members.length === 0) return { g, empty: true, left: 0, right: chartW }
    let s = members[0].start
    let e = members[0].end
    for (const m of members) {
      if (m.start < s) s = m.start
      if (m.end > e) e = m.end
    }
    return { g, empty: false, left: offsetIn(s), right: offsetIn(e) }
  })
  const nGroups = groupBandData.length

  const panelX = 0.4
  const panelY = 1.3
  const panelW = 9.2
  const yearRowY = 1.4
  const monthRowY = 1.66
  const gridTop = 1.96
  const lanesTop = 2.08
  const barsBottom = lanesTop + (lanes - 1) * laneHeight + barH
  const gridBottom = barsBottom + 0.06
  // Group band top (inches), measured from lanesTop. Same below-lanes model and
  // offset healing as the web roadmap so the slide stays aligned with it.
  const groupBaseTopPx = (i: number) => lanes * WEB_LANE + WEB_GROUP_GAP + i * WEB_GROUP_ROW
  const groupClampMaxPx = lanes * WEB_LANE + WEB_GROUP_GAP + (nGroups + 1) * WEB_GROUP_ROW
  const groupBandTop = (i: number, offsetY: number | undefined) => {
    const raw = groupBaseTopPx(i) + (offsetY ?? 0)
    const healed = raw >= 0 && raw <= groupClampMaxPx ? (offsetY ?? 0) : 0
    return lanesTop + (groupBaseTopPx(i) + healed) * pxToIn
  }
  const groupsBottom = groupBandData.reduce(
    (lo, b, i) => Math.max(lo, groupBandTop(i, b.g.offsetY) + GROUP_BAND_IN),
    barsBottom
  )
  const legendY = groupsBottom + 0.32

  // Legend entries: rollouts, then Go-live, then group brackets — mirrors the web
  // roadmap legend. Lay them out left-to-right, wrapping within the chart width.
  const legendEntries: { kind: 'rollout' | 'golive' | 'group'; colour: string; label: string }[] = [
    ...estimation.rollouts.map((ro, i) => ({
      kind: 'rollout' as const,
      colour: ro.colour || ROLLOUT_FALLBACK[i % ROLLOUT_FALLBACK.length],
      label: ro.name,
    })),
    { kind: 'golive' as const, colour: PPTX_BRAND.green, label: 'Go-live' },
    ...estimation.groups.map((g) => ({
      kind: 'group' as const,
      colour: g.colour,
      label: g.label || 'Untitled group',
    })),
  ]
  const legendItemW = (label: string) => 0.3 + Math.max(0.3, label.length * 0.072) + 0.28
  const legendRowH = 0.3
  const legendLayout = legendEntries.map((e) => ({ ...e, x: 0, y: 0, w: legendItemW(e.label) }))
  let legendMaxRow = 0
  {
    let lx = chartX
    let row = 0
    for (const item of legendLayout) {
      if (lx + item.w > chartX + chartW && lx > chartX) {
        row++
        lx = chartX
      }
      item.x = lx
      item.y = legendY + row * legendRowH
      lx += item.w
      legendMaxRow = Math.max(legendMaxRow, row)
    }
  }
  const panelH = legendY + legendMaxRow * legendRowH + 0.36 - panelY

  // Adaptive palette derived from the chosen card background.
  const bg = estimation.background || DEFAULT_ROADMAP_BG
  const gridHex = hex(gridColor(bg))
  const dividerHex = hex(dividerColor(bg))
  const yearHex = hex(axisTextColor(bg))
  const monthHex = hex(axisSubTextColor(bg))

  // Glossy, opaque card: base fill + a translucent lightened band for sheen.
  slide.addShape(pptx.ShapeType.roundRect, {
    x: panelX, y: panelY, w: panelW, h: panelH,
    fill: { color: hex(bg) },
    line: { color: hex(cardBorderColor(bg)), width: 0.75 },
    rectRadius: 0.1,
  })
  slide.addShape(pptx.ShapeType.roundRect, {
    x: panelX, y: panelY, w: panelW, h: panelH * 0.52,
    fill: { color: hex(lighten(bg, 0.16)), transparency: 62 },
    line: { type: 'none' },
    rectRadius: 0.1,
  })

  // Vertical month gridlines (dotted).
  for (let i = 0; i <= totalMonths; i++) {
    slide.addShape(pptx.ShapeType.line, {
      x: chartX + i * inPerMonth,
      y: gridTop,
      w: 0,
      h: Math.max(0.1, gridBottom - gridTop),
      line: { color: gridHex, width: 0.75, dashType: 'sysDot' },
    })
  }

  // Stronger dividers + labels for each year group.
  let acc = 0
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    if (gi > 0) {
      slide.addShape(pptx.ShapeType.line, {
        x: chartX + acc * inPerMonth,
        y: yearRowY,
        w: 0,
        h: Math.max(0.1, gridBottom - yearRowY),
        line: { color: dividerHex, width: 1 },
      })
    }
    slide.addText(String(g.year), {
      x: chartX + acc * inPerMonth,
      y: yearRowY,
      w: g.count * inPerMonth,
      h: 0.24,
      fontFace: 'Arial',
      fontSize: 9,
      bold: true,
      color: yearHex,
      align: 'center',
      valign: 'middle',
    })
    acc += g.count
  }

  // Month labels (year shown separately above).
  for (let i = 0; i < totalMonths; i++) {
    slide.addText(format(months[i], 'MMM'), {
      x: chartX + i * inPerMonth,
      y: monthRowY,
      w: inPerMonth,
      h: 0.26,
      fontFace: 'Arial',
      fontSize: totalMonths > 16 ? 7 : 8,
      color: monthHex,
      align: 'center',
      valign: 'middle',
    })
  }

  for (const p of valid) {
    const left = chartX + offsetIn(p.start)
    const right = chartX + offsetIn(p.end)
    const w = Math.max(0.45, right - left)
    const y = lanesTop + p.lane * laneHeight
    // Label lives INSIDE the chevron shape so it stays centred within the bar and
    // can never overflow into a neighbouring chevron. Font shrinks to fit narrow bars.
    slide.addText(p.name, {
      shape: pptx.ShapeType.chevron,
      x: left,
      y,
      w,
      h: barH,
      fill: { color: hex(p.colour) },
      line: { type: 'none' },
      fontFace: 'Arial',
      fontSize: fitFontSize(p.name, w),
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      wrap: false,
      fit: 'shrink',
      inset: 0.04,
    })
    // Go-live diamonds at their exact date and the same vertical offset as the web.
    for (const gl of p.goLives) {
      const glLeft = chartX + offsetIn(gl)
      const glOffset = (estimation.goLiveOffsets[`${p.id}:${format(gl, 'yyyy-MM-dd')}`] ?? 0) * pxToIn
      slide.addShape(pptx.ShapeType.diamond, {
        x: glLeft - 0.09,
        y: y + barH / 2 + glOffset - 0.09,
        w: 0.18,
        h: 0.18,
        fill: { color: PPTX_BRAND.green },
        line: { color: 'FFFFFF', width: 1.25 },
      })
    }
  }

  // Group brackets — drawn over the bars (tinted fill + coloured border, dashed
  // when the group has no phases yet), mirroring the web roadmap.
  for (let i = 0; i < groupBandData.length; i++) {
    const b = groupBandData[i]
    const top = groupBandTop(i, b.g.offsetY)
    const bandW = Math.max(0.24, b.right - b.left)
    const colHex = hex(b.g.colour)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: chartX + b.left,
      y: top,
      w: bandW,
      h: GROUP_BAND_IN,
      fill: { color: colHex, transparency: 86 },
      line: { color: colHex, width: 1, dashType: b.empty ? 'dash' : 'solid' },
      rectRadius: 0.03,
    })
    slide.addShape(pptx.ShapeType.rect, {
      x: chartX + b.left + 0.06,
      y: top + GROUP_BAND_IN / 2 - 0.04,
      w: 0.08,
      h: 0.08,
      fill: { color: colHex },
      line: { type: 'none' },
    })
    slide.addText(b.g.label || 'Untitled group', {
      x: chartX + b.left + 0.2,
      y: top - 0.02,
      w: Math.max(0.2, bandW - 0.26),
      h: GROUP_BAND_IN + 0.04,
      fontFace: 'Arial',
      fontSize: 8,
      bold: true,
      color: '1A1A1A',
      align: 'left',
      valign: 'middle',
      wrap: false,
      fit: 'shrink',
    })
  }

  // Legend (inside the card, adaptive text colour). Swatches mirror the web roadmap:
  // filled square for rollouts, green diamond for go-live, outlined tint for groups.
  for (const item of legendLayout) {
    if (item.kind === 'golive') {
      slide.addShape(pptx.ShapeType.diamond, {
        x: item.x, y: item.y, w: 0.16, h: 0.16,
        fill: { color: item.colour },
        line: { color: 'FFFFFF', width: 1 },
      })
    } else if (item.kind === 'group') {
      slide.addShape(pptx.ShapeType.rect, {
        x: item.x, y: item.y, w: 0.18, h: 0.18,
        fill: { color: hex(item.colour), transparency: 84 },
        line: { color: hex(item.colour), width: 1 },
      })
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: item.x, y: item.y, w: 0.18, h: 0.18,
        fill: { color: hex(item.colour) },
        line: { type: 'none' },
      })
    }
    slide.addText(item.label, {
      x: item.x + 0.26, y: item.y - 0.06, w: item.w - 0.26, h: 0.3,
      fontFace: 'Arial', fontSize: 10, color: yearHex, valign: 'middle',
    })
  }
}
