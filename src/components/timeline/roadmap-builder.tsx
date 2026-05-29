'use client'

import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  addMonths,
  differenceInCalendarMonths,
  getDate,
  getDaysInMonth,
  startOfMonth,
  format,
} from 'date-fns'
import { Plus, Download, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import type { RolloutDTO } from '@/hooks/use-estimation'

const LANE_HEIGHT = 56
const BAR_HEIGHT = 36
const NOTCH = 16
const CHEVRON_CLIP = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`
const FIRST_CHEVRON_CLIP = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`

interface FlatPhase {
  id: string
  name: string
  start: Date
  end: Date
  rolloutId: string
  rolloutName: string
  colour: string
  lane: number
  isFirst: boolean
  goLives: Date[]
}

export function RoadmapBuilder({ rollouts }: { rollouts: RolloutDTO[] }) {
  const [pxPerMonth, setPxPerMonth] = useState(90)
  const captureRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const model = useMemo(() => {
    const phases: FlatPhase[] = []
    rollouts.forEach((ro, laneIndex) => {
      ro.phases.forEach((p, i) => {
        phases.push({
          id: p.id,
          name: p.name,
          start: new Date(p.startDate),
          end: new Date(p.endDate),
          rolloutId: ro.id,
          rolloutName: ro.name,
          colour: ro.colour,
          lane: laneIndex,
          isFirst: i === 0,
          goLives: p.goLives.map((d) => new Date(d)),
        })
      })
    })

    const valid = phases.filter((p) => !isNaN(p.start.getTime()) && !isNaN(p.end.getTime()))
    if (valid.length === 0) return null

    let min = valid[0].start
    let max = valid[0].end
    for (const p of valid) {
      if (p.start < min) min = p.start
      if (p.end > max) max = p.end
    }
    const axisStart = startOfMonth(min)
    const totalMonths = differenceInCalendarMonths(max, axisStart) + 1
    const months = Array.from({ length: totalMonths }, (_, i) => addMonths(axisStart, i))

    return { phases: valid, axisStart, totalMonths, months, lanes: rollouts.length }
  }, [rollouts])

  if (!model) {
    return (
      <EmptyState
        message="No phases to visualise"
        hint="Add rollouts and phases in the Estimation tab to build the roadmap."
      />
    )
  }

  const { phases, axisStart, totalMonths, months, lanes } = model
  const width = totalMonths * pxPerMonth

  function offsetPx(date: Date) {
    const monthsFromStart = differenceInCalendarMonths(date, axisStart)
    const dayFraction = (getDate(date) - 1) / getDaysInMonth(date)
    return (monthsFromStart + dayFraction) * pxPerMonth
  }

  function monthStartPx(date: Date) {
    return differenceInCalendarMonths(startOfMonth(date), axisStart) * pxPerMonth
  }

  // Group months by year for the header.
  const yearGroups: { year: number; count: number }[] = []
  for (const m of months) {
    const year = m.getFullYear()
    const last = yearGroups[yearGroups.length - 1]
    if (last && last.year === year) last.count++
    else yearGroups.push({ year, count: 1 })
  }

  async function exportPng() {
    if (!captureRef.current) return
    setExporting(true)
    const toolbar = toolbarRef.current
    if (toolbar) toolbar.style.visibility = 'hidden'
    try {
      const dataUrl = await toPng(captureRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = 'roadmap.png'
      link.href = dataUrl
      link.click()
    } catch {
      toast.error('Failed to export PNG')
    } finally {
      if (toolbar) toolbar.style.visibility = 'visible'
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div ref={toolbarRef} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
          <input
            type="range"
            min={50}
            max={180}
            value={pxPerMonth}
            onChange={(e) => setPxPerMonth(Number(e.target.value))}
            className="w-40"
            aria-label="Zoom"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting}>
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export PNG'}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <div ref={captureRef} className="min-w-fit bg-white p-4">
          {/* Year + month header */}
          <div style={{ width, marginLeft: 0 }}>
            <div className="flex border-b">
              {yearGroups.map((g) => (
                <div
                  key={g.year}
                  style={{ width: g.count * pxPerMonth }}
                  className="border-l py-1 text-center text-xs font-semibold text-muted-foreground first:border-l-0"
                >
                  {g.year}
                </div>
              ))}
            </div>
            <div className="flex border-b">
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{ width: pxPerMonth }}
                  className="border-l py-1 text-center text-[10px] text-muted-foreground first:border-l-0"
                >
                  {format(m, 'MMM')}
                </div>
              ))}
            </div>
          </div>

          {/* Lanes */}
          <div className="relative" style={{ width, height: lanes * LANE_HEIGHT + 8 }}>
            {/* Month gridlines */}
            {months.map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-dashed border-muted"
                style={{ left: i * pxPerMonth }}
              />
            ))}

            {/* Chevron bars */}
            {phases.map((p) => {
              const left = offsetPx(p.start)
              const right = offsetPx(p.end)
              const barWidth = Math.max(NOTCH * 2 + 8, right - left)
              const top = p.lane * LANE_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2
              return (
                <div
                  key={p.id}
                  className="absolute flex items-center justify-center px-4 text-xs font-medium text-white"
                  style={{
                    left,
                    top,
                    width: barWidth,
                    height: BAR_HEIGHT,
                    backgroundColor: p.colour,
                    clipPath: p.isFirst ? FIRST_CHEVRON_CLIP : CHEVRON_CLIP,
                    borderTopLeftRadius: p.isFirst ? 6 : 0,
                    borderBottomLeftRadius: p.isFirst ? 6 : 0,
                  }}
                  title={`${p.rolloutName} · ${p.name}`}
                >
                  <span className="truncate">
                    {p.isFirst && <Plus className="mr-1 inline h-3 w-3" />}
                    {p.name}
                  </span>
                </div>
              )
            })}

            {/* Go-live diamonds */}
            {phases.flatMap((p) =>
              p.goLives.map((gl, idx) => {
                const left = monthStartPx(gl)
                const top = p.lane * LANE_HEIGHT + LANE_HEIGHT / 2
                return (
                  <div
                    key={`${p.id}-gl-${idx}`}
                    className="absolute"
                    title={`Go-live: ${format(gl, 'd MMM yyyy')}`}
                    style={{
                      left: left - 7,
                      top: top - 7,
                      width: 14,
                      height: 14,
                      backgroundColor: '#2EB872',
                      transform: 'rotate(45deg)',
                      border: '2px solid white',
                    }}
                  />
                )
              })
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3">
            {rollouts.map((ro) => (
              <div key={ro.id} className="flex items-center gap-1.5 text-xs">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: ro.colour }} />
                {ro.name}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rotate-45 border border-white" style={{ backgroundColor: '#2EB872' }} />
              Go-live
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
