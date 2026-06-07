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

const c = (hex: string) => `#${hex}`
const ROLLOUT_FALLBACK = ['E87722', '2196F3', '2EB872', '9C27B0']

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
  const phases = estimation.rollouts.flatMap((ro, lane) =>
    ro.phases.map((ph) => ({
      name: ph.name,
      start: new Date(ph.startDate),
      end: new Date(ph.endDate),
      colour: ro.colour || ROLLOUT_FALLBACK[lane % ROLLOUT_FALLBACK.length],
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
  const chartX = 0.6
  const chartW = 8.8
  const inPerMonth = chartW / totalMonths
  const monthLabelY = 1.55
  const topY = 2.05
  const lanes = estimation.rollouts.length
  const laneHeight = lanes <= 2 ? 0.95 : lanes <= 4 ? 0.75 : 0.6
  const barH = Math.min(0.55, laneHeight * 0.58)
  const offsetIn = (date: Date) =>
    (differenceInCalendarMonths(date, axisStart) + (getDate(date) - 1) / getDaysInMonth(date)) * inPerMonth

  return (
    <>
      {Array.from({ length: totalMonths }).map((_, i) => (
        <Box key={i} x={chartX + i * inPerMonth} y={monthLabelY} w={inPerMonth} style={{ fontSize: 8, color: c(BRAND.midGray), textAlign: 'center' }}>
          {format(addMonths(axisStart, i), 'MMM yy')}
        </Box>
      ))}
      {valid.map((p, i) => {
        const left = chartX + offsetIn(p.start)
        const right = chartX + offsetIn(p.end)
        const w = Math.max(0.45, right - left)
        const y = topY + p.lane * laneHeight
        return (
          <Box key={i} x={left} y={y} w={w} h={barH} style={{ background: c(p.colour), clipPath: CHEVRON_CLIP }}>
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, padding: `0 ${inch(0.16)}px`, boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
          </Box>
        )
      })}
      {estimation.rollouts.map((ro, i) => (
        <Box key={ro.id} x={chartX + i * 2.9} y={topY + lanes * laneHeight + 0.45} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: inch(0.2), height: inch(0.2), background: c(ro.colour || ROLLOUT_FALLBACK[i % ROLLOUT_FALLBACK.length]) }} />
          <span style={{ fontSize: 11, color: c(BRAND.black) }}>{ro.name}</span>
        </Box>
      ))}
    </>
  )
}
