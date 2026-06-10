'use client'

import {
  addMonths,
  differenceInCalendarMonths,
  getDate,
  getDaysInMonth,
  startOfMonth,
  format,
} from 'date-fns'
import { BRAND } from '@/lib/documents/slides/shared/branding'
import { Box, inch } from './slide-canvas'
import type { LoadedEstimation } from '@/lib/estimation-data'
import {
  DEFAULT_ROADMAP_BG,
  glossyGradientCss,
  gridColor,
  dividerColor,
  axisTextColor,
  axisSubTextColor,
  cardBorderColor,
  yearGroups,
} from '@/lib/roadmap-style'

const c = (hex: string) => `#${hex}`
/** Rollout/phase colours may be stored with or without a leading '#'. */
const swatch = (hex: string) => (hex.startsWith('#') ? hex : `#${hex}`)
/** Light translucent fill for a group swatch — mirrors the web roadmap legend. */
const groupFill = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return swatch(hex)
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.16)`
}
const ROLLOUT_FALLBACK = ['E87722', '2196F3', '2EB872', '9C27B0']
/** Key for a go-live's stored vertical offset: phase + its date. */
const glKey = (phaseId: string, date: Date) => `${phaseId}:${format(date, 'yyyy-MM-dd')}`

/** Pick a label font size (px) that fits a chevron of the given inch width. */
function fitFontSize(text: string, widthIn: number, max = 10, min = 6) {
  const avail = Math.max(0.1, widthIn - 0.34) // inset past both notches
  const perChar = 0.0072 // ≈ inches per pt per char, Arial bold
  const size = avail / (Math.max(1, text.length) * perChar)
  return Math.max(min, Math.min(max, Math.round(size)))
}

/* ---- chrome ---- */

export function PreviewSectionLabel({ label }: { label: string }) {
  return (
    <>
      <Box x={0.5} y={0.42} w={0.12} h={0.12} style={{ background: c(BRAND.magenta) }} />
      <Box x={0.72} y={0.34} w={7} style={{ fontSize: 9, fontWeight: 700, color: c(BRAND.magenta), letterSpacing: 2 }}>
        {label.toUpperCase()}
      </Box>
    </>
  )
}

export function PreviewTitle({ title }: { title: string }) {
  return (
    <Box x={0.5} y={0.72} w={9} style={{ fontSize: 22, fontWeight: 700, color: c(BRAND.black), lineHeight: 1.1 }}>
      {title}
    </Box>
  )
}

export function PreviewFooter({ footer, n }: { footer: string; n: number }) {
  return (
    <>
      <Box x={0.5} y={5.32} w={7} style={{ fontSize: 8, color: c(BRAND.midGray) }}>{footer}</Box>
      <Box x={9} y={5.32} w={0.5} style={{ fontSize: 8, color: c(BRAND.midGray), textAlign: 'right' }}>{n}</Box>
    </>
  )
}

export function PreviewPlaceholder({ message, y = 2.4 }: { message: string; y?: number }) {
  return (
    <Box x={0.5} y={y} w={9} style={{ fontSize: 12, fontStyle: 'italic', color: c(BRAND.midGray) }}>
      {message}
    </Box>
  )
}

/* ---- content blocks ---- */

export function PreviewTable({
  headers,
  rows,
  x = 0.5,
  y,
  w = 9.0,
  colW,
  fontSize = 11,
}: {
  headers: string[]
  rows: string[][]
  x?: number
  y: number
  w?: number
  colW?: number[]
  fontSize?: number
}) {
  const widths = colW ?? headers.map(() => w / headers.length)
  return (
    <Box x={x} y={y} w={w}>
      <table style={{ borderCollapse: 'collapse', width: inch(w), tableLayout: 'fixed' }}>
        <colgroup>
          {widths.map((cw, i) => (
            <col key={i} style={{ width: inch(cw) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  background: c(BRAND.magenta),
                  color: '#fff',
                  fontWeight: 700,
                  fontSize,
                  textAlign: 'left',
                  padding: '3px 5px',
                  border: `0.5px solid ${c(BRAND.border)}`,
                  verticalAlign: 'middle',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    background: ri % 2 === 0 ? '#fff' : c(BRAND.rowGray),
                    color: c(BRAND.darkGray),
                    fontSize,
                    padding: '3px 5px',
                    border: `0.5px solid ${c(BRAND.border)}`,
                    verticalAlign: 'middle',
                    wordBreak: 'break-word',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  )
}

export function PreviewBullets({
  items,
  x = 0.5,
  y,
  w = 9.0,
  fontSize = 13,
}: {
  items: string[]
  x?: number
  y: number
  w?: number
  fontSize?: number
}) {
  return (
    <Box x={x} y={y} w={w}>
      <ul style={{ margin: 0, paddingLeft: 16, color: c(BRAND.darkGray), fontSize }}>
        {items.map((t, i) => (
          <li key={i} style={{ marginBottom: 5, lineHeight: 1.3 }}>{t}</li>
        ))}
      </ul>
    </Box>
  )
}

export function PreviewCards({
  cards,
  y,
  cols,
  h = 1.6,
  rowGap = 0.25,
}: {
  cards: Array<{ title: string; description: string }>
  y: number
  cols?: number
  h?: number
  rowGap?: number
}) {
  if (cards.length === 0) return null
  const nCols = cols ?? Math.min(cards.length, 4)
  const gap = 0.25
  const cardW = (9.0 - gap * (nCols - 1)) / nCols
  return (
    <>
      {cards.map((card, i) => {
        const col = i % nCols
        const row = Math.floor(i / nCols)
        const x = 0.5 + col * (cardW + gap)
        const cy = y + row * (h + rowGap)
        return (
          <Box key={i} x={x} y={cy} w={cardW} h={h} style={{ background: c(BRAND.lightGray), borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: inch(0.08), background: c(BRAND.magenta) }} />
            <div style={{ padding: `${inch(0.12)}px ${inch(0.2)}px` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: c(BRAND.black), marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: 9.5, color: c(BRAND.darkGray), lineHeight: 1.25 }}>{card.description}</div>
            </div>
          </Box>
        )
      })}
    </>
  )
}

export function PreviewSteps({ steps, y, h = 1.9 }: { steps: string[]; y: number; h?: number }) {
  if (steps.length === 0) return null
  const n = steps.length
  const gap = 0.25
  const cardW = (9.0 - gap * (n - 1)) / n
  return (
    <>
      {steps.map((step, i) => {
        const x = 0.5 + i * (cardW + gap)
        return (
          <Box key={i} x={x} y={y} w={cardW} h={h} style={{ background: c(BRAND.lightGray), borderRadius: 4 }}>
            <div
              style={{
                position: 'absolute',
                left: inch(0.15),
                top: inch(0.15),
                width: inch(0.4),
                height: inch(0.4),
                borderRadius: '50%',
                background: c(BRAND.magenta),
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i + 1}
            </div>
            <div style={{ position: 'absolute', left: inch(0.12), top: inch(0.6), width: inch(cardW - 0.24), fontSize: 10, color: c(BRAND.darkGray), lineHeight: 1.25 }}>
              {step}
            </div>
          </Box>
        )
      })}
    </>
  )
}

export function PreviewCallout({ text, y = 1.35 }: { text: string; y?: number }) {
  return (
    <Box x={0.5} y={y} w={4.2} style={{ fontSize: 34, fontWeight: 700, color: c(BRAND.magenta) }}>{text}</Box>
  )
}

/* ---- chevron roadmap (mirrors addRoadmap) ---- */

const NOTCH = 10
const CHEVRON_CLIP = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`

export function PreviewChevrons({ estimation }: { estimation: LoadedEstimation }) {
  const bg = estimation.background || DEFAULT_ROADMAP_BG
  const grid = gridColor(bg)
  const divider = dividerColor(bg)
  const textCol = axisTextColor(bg)
  const subCol = axisSubTextColor(bg)

  const phases = estimation.rollouts.flatMap((ro, lane) =>
    ro.phases.map((ph) => ({
      id: ph.id,
      name: ph.name,
      start: new Date(ph.startDate),
      end: new Date(ph.endDate),
      // Per-phase colour override wins over the rollout colour, mirroring the web roadmap.
      colour: ph.colour || ro.colour || ROLLOUT_FALLBACK[lane % ROLLOUT_FALLBACK.length],
      lane,
      goLives: ph.goLives.map((d) => new Date(d)),
    }))
  )
  const valid = phases.filter((p) => !isNaN(p.start.getTime()) && !isNaN(p.end.getTime()))
  if (valid.length === 0) return <PreviewPlaceholder message="No phases to display." />

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

  const chartX = 0.6
  const chartW = 8.8
  const inPerMonth = chartW / totalMonths
  const lanes = estimation.rollouts.length
  const laneHeight = lanes <= 2 ? 0.95 : lanes <= 4 ? 0.75 : 0.6
  const barH = Math.min(0.55, laneHeight * 0.58)

  const offsetIn = (date: Date) =>
    (differenceInCalendarMonths(date, axisStart) + (getDate(date) - 1) / getDaysInMonth(date)) * inPerMonth

  // Group brackets — mirror the web roadmap: bands overlay BELOW the lanes (no
  // reserved strip above). Web offsets are pixels on a 56px lane, scaled to the
  // preview's lane height; legacy out-of-range offsets heal to the default.
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
  const yearRowY = 1.4
  const monthRowY = 1.66
  const gridTop = 1.96
  const lanesTop = 2.08
  const barsBottom = lanesTop + (lanes - 1) * laneHeight + barH
  const gridBottom = barsBottom + 0.06
  // Group band top (inches), measured from lanesTop. Same below-lanes model and
  // offset healing as the web roadmap so the two stay aligned.
  const groupBaseTopPx = (i: number) => lanes * WEB_LANE + WEB_GROUP_GAP + i * WEB_GROUP_ROW
  const groupClampMaxPx = lanes * WEB_LANE + WEB_GROUP_GAP + (nGroups + 1) * WEB_GROUP_ROW
  const groupBandTop = (i: number, offsetY: number | undefined) => {
    const raw = groupBaseTopPx(i) + (offsetY ?? 0)
    const healed = raw >= 0 && raw <= groupClampMaxPx ? (offsetY ?? 0) : 0
    return lanesTop + (groupBaseTopPx(i) + healed) * pxToIn
  }
  // Legend sits below the lanes and any group band dragged beneath them.
  const groupsBottom = groupBandData.reduce(
    (lo, b, i) => Math.max(lo, groupBandTop(i, b.g.offsetY) + GROUP_BAND_IN),
    barsBottom
  )
  const legendY = groupsBottom + 0.32

  // Legend items: rollouts, then Go-live, then group brackets — mirrors the web
  // roadmap legend. Estimate wrap rows so the card grows to fit them.
  const legendItems = [
    ...estimation.rollouts.map((ro, i) => ({
      kind: 'rollout' as const,
      colour: swatch(ro.colour || ROLLOUT_FALLBACK[i % ROLLOUT_FALLBACK.length]),
      label: ro.name,
    })),
    { kind: 'golive' as const, colour: '#2EB872', label: 'Go-live' },
    ...estimation.groups.map((g) => ({
      kind: 'group' as const,
      colour: swatch(g.colour),
      label: g.label || 'Untitled group',
    })),
  ]
  const legendItemIn = (label: string) => 0.3 + Math.max(0.3, label.length * 0.072) + 0.28
  let legendRows = 1
  {
    let cur = chartX
    for (const it of legendItems) {
      const w = legendItemIn(it.label)
      if (cur + w > chartX + chartW && cur > chartX) {
        legendRows++
        cur = chartX
      }
      cur += w
    }
  }
  const legendRowH = 0.3
  const panelH = legendY + (legendRows - 1) * legendRowH + 0.36 - panelY

  return (
    <>
      {/* Glossy card */}
      <Box x={panelX} y={panelY} w={9.2} h={panelH} style={{ background: glossyGradientCss(bg), border: `1px solid ${cardBorderColor(bg)}`, borderRadius: 8, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }} />

      {/* Vertical month gridlines (dotted) */}
      {Array.from({ length: totalMonths + 1 }).map((_, i) => (
        <Box key={`g${i}`} x={chartX + i * inPerMonth} y={gridTop} style={{ height: inch(gridBottom - gridTop), borderLeft: `1px dotted ${grid}` }} />
      ))}

      {/* Year row (grouped) with separators */}
      {groups.map((g, gi) => {
        const startIdx = groups.slice(0, gi).reduce((s, x) => s + x.count, 0)
        return (
          <Box key={`y${g.year}`} x={chartX + startIdx * inPerMonth} y={yearRowY} w={g.count * inPerMonth} style={{ fontSize: 9, fontWeight: 700, color: textCol, textAlign: 'center', letterSpacing: 0.5 }}>
            {g.year}
          </Box>
        )
      })}
      {groups.slice(1).map((_, gi) => {
        const boundaryIdx = groups.slice(0, gi + 1).reduce((s, x) => s + x.count, 0)
        return <Box key={`yd${gi}`} x={chartX + boundaryIdx * inPerMonth} y={yearRowY - 0.02} style={{ height: inch(gridBottom - yearRowY + 0.02), borderLeft: `1px solid ${divider}` }} />
      })}

      {/* Month labels */}
      {months.map((m, i) => (
        <Box key={`m${i}`} x={chartX + i * inPerMonth} y={monthRowY} w={inPerMonth} style={{ fontSize: 8, color: subCol, textAlign: 'center' }}>
          {format(m, 'MMM')}
        </Box>
      ))}

      {/* Chevron bars */}
      {valid.map((p, i) => {
        const left = chartX + offsetIn(p.start)
        const right = chartX + offsetIn(p.end)
        const w = Math.max(0.45, right - left)
        const y = lanesTop + p.lane * laneHeight
        const fontSize = fitFontSize(p.name, w)
        return (
          <Box key={i} x={left} y={y} w={w} h={barH} style={{ background: swatch(p.colour), clipPath: CHEVRON_CLIP }}>
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize, fontWeight: 700, padding: `0 ${inch(0.16)}px`, boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1 }}>
              {p.name}
            </div>
          </Box>
        )
      })}

      {/* Group brackets — drawn over the bars, like the web roadmap */}
      {groupBandData.map((b, i) => {
        const top = groupBandTop(i, b.g.offsetY)
        const w = Math.max(GROUP_BAND_IN, b.right - b.left)
        const col = swatch(b.g.colour)
        return (
          <Box
            key={`grp${b.g.id}`}
            x={chartX + b.left}
            y={top}
            w={w}
            h={GROUP_BAND_IN}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: `0 ${inch(0.07)}px`,
              background: groupFill(col),
              border: `1px ${b.empty ? 'dashed' : 'solid'} ${col}`,
              borderRadius: 4,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <span style={{ width: inch(0.07), height: inch(0.07), borderRadius: 2, background: col, flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {b.g.label || 'Untitled group'}
            </span>
          </Box>
        )
      })}

      {/* Go-live diamonds (exact date; same vertical offset as the web roadmap) */}
      {valid.flatMap((p, pi) =>
        p.goLives.map((gl, gi) => {
          const cx = chartX + offsetIn(gl)
          const cy =
            lanesTop + p.lane * laneHeight + barH / 2 + (estimation.goLiveOffsets[glKey(p.id, gl)] ?? 0) * pxToIn
          return <Box key={`gl${pi}-${gi}`} x={cx - 0.07} y={cy - 0.07} w={0.14} h={0.14} style={{ background: '#2EB872', transform: 'rotate(45deg)', border: '1.5px solid #fff' }} />
        })
      )}

      {/* Legend — rollouts, go-live, then group brackets (mirrors the web roadmap) */}
      <Box
        x={chartX}
        y={legendY}
        w={chartW}
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: inch(0.28), rowGap: inch(0.08) }}
      >
        {legendItems.map((it, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {it.kind === 'golive' ? (
              <span style={{ width: inch(0.15), height: inch(0.15), background: '#2EB872', transform: 'rotate(45deg)', border: '1.5px solid #fff' }} />
            ) : it.kind === 'group' ? (
              <span style={{ width: inch(0.18), height: inch(0.18), borderRadius: 2, background: groupFill(it.colour), border: `1px solid ${it.colour}` }} />
            ) : (
              <span style={{ width: inch(0.18), height: inch(0.18), borderRadius: 2, background: it.colour }} />
            )}
            <span style={{ fontSize: 10, color: textCol }}>{it.label}</span>
          </span>
        ))}
      </Box>
    </>
  )
}
