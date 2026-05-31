'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  addDays,
  addMonths,
  differenceInCalendarMonths,
  getDate,
  getDaysInMonth,
  startOfMonth,
  format,
} from 'date-fns'
import { Plus, Download, ZoomIn, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/empty-state'
import type { RolloutDTO } from '@/hooks/use-estimation'

const LANE_HEIGHT = 56
const BAR_HEIGHT = 36
const NOTCH = 16
const HANDLE_WIDTH = 10
const DEFAULT_COLOURS = ['#E87722', '#2196F3', '#2EB872', '#9C27B0', '#E6007E', '#F59E0B']
const CHEVRON_CLIP = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`
const FIRST_CHEVRON_CLIP = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`

interface FlatPhase {
  id: string
  name: string
  start: Date
  end: Date
  rolloutId: string
  rolloutName: string
  colour: string // effective bar colour (phase override or rollout fallback)
  colourOverride: string | null // the phase's own colour, if set
  rolloutColour: string
  lane: number
  isFirst: boolean
  goLives: Date[]
}

type DragMode = 'move' | 'resize-left' | 'resize-right'

interface DragInfo {
  phaseId: string
  mode: DragMode
  startClientX: number
  startClientY: number
  origStart: Date
  origEnd: Date
  origLane: number
}

interface Draft {
  phaseId: string
  start: Date
  end: Date
  lane: number
}

type UpdatePhase = (input: {
  id: string
  name?: string
  colour?: string | null
  startDate?: string
  endDate?: string
  rolloutId?: string
  sortOrder?: number
}) => Promise<unknown>

interface RoadmapBuilderProps {
  rollouts: RolloutDTO[]
  onUpdatePhase?: UpdatePhase
}

export function RoadmapBuilder({ rollouts, onUpdatePhase }: RoadmapBuilderProps) {
  const [pxPerMonth, setPxPerMonth] = useState(90)
  const captureRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  // Right-click context menu + edit dialog state.
  const [menu, setMenu] = useState<{ phase: FlatPhase; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<FlatPhase | null>(null)

  // Live drag state. `draft` drives the visual position; `dragRef` holds the
  // immutable origin so pointer-move math is stable across re-renders.
  const [draft, setDraft] = useState<Draft | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const pxPerMonthRef = useRef(pxPerMonth)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  useEffect(() => {
    pxPerMonthRef.current = pxPerMonth
  }, [pxPerMonth])

  // Close the context menu on Escape.
  useEffect(() => {
    if (!menu) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  const interactive = Boolean(onUpdatePhase)

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
          colour: p.colour ?? ro.colour,
          colourOverride: p.colour,
          rolloutColour: ro.colour,
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
    // Include any in-progress drag so the axis can grow as a bar is dragged past its edges.
    if (draft) {
      if (draft.start < min) min = draft.start
      if (draft.end > max) max = draft.end
    }
    const axisStart = startOfMonth(min)
    const totalMonths = differenceInCalendarMonths(max, axisStart) + 1
    const months = Array.from({ length: totalMonths }, (_, i) => addMonths(axisStart, i))

    return { phases: valid, axisStart, totalMonths, months, lanes: rollouts.length }
  }, [rollouts, draft])

  // Attach window-level pointer listeners only while a drag is in progress.
  const isDragging = draft !== null
  useEffect(() => {
    if (!isDragging || !onUpdatePhase) return

    const laneCount = rollouts.length

    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      const pxPerDay = pxPerMonthRef.current / 30
      const deltaDays = Math.round((e.clientX - d.startClientX) / pxPerDay)
      let start = d.origStart
      let end = d.origEnd
      let lane = d.origLane
      if (d.mode === 'move') {
        start = addDays(d.origStart, deltaDays)
        end = addDays(d.origEnd, deltaDays)
        const deltaLane = Math.round((e.clientY - d.startClientY) / LANE_HEIGHT)
        lane = Math.min(Math.max(0, d.origLane + deltaLane), laneCount - 1)
      } else if (d.mode === 'resize-left') {
        start = addDays(d.origStart, deltaDays)
        if (start >= end) start = addDays(end, -1)
      } else {
        end = addDays(d.origEnd, deltaDays)
        if (end <= start) end = addDays(start, 1)
      }
      setDraft({ phaseId: d.phaseId, start, end, lane })
    }

    async function onUp() {
      const d = dragRef.current
      const current = draftRef.current
      dragRef.current = null
      if (d && current) {
        const datesChanged =
          current.start.getTime() !== d.origStart.getTime() ||
          current.end.getTime() !== d.origEnd.getTime()
        const targetRollout = rollouts[current.lane]
        const origRollout = rollouts[d.origLane]
        const laneChanged = Boolean(
          targetRollout && origRollout && targetRollout.id !== origRollout.id
        )
        if (datesChanged || laneChanged) {
          // Keep the draft applied through the network round-trip to avoid a
          // flash back to the old position before the query refetches.
          try {
            await onUpdatePhase!({
              id: current.phaseId,
              startDate: format(current.start, 'yyyy-MM-dd'),
              endDate: format(current.end, 'yyyy-MM-dd'),
              // When moved to another lane, reassign to that rollout and append
              // it to the end of the target lane's phase order.
              ...(laneChanged
                ? { rolloutId: targetRollout!.id, sortOrder: targetRollout!.phases.length }
                : {}),
            })
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update phase')
          }
        }
      }
      setDraft(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging])

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

  function beginDrag(e: React.PointerEvent, phase: FlatPhase, mode: DragMode) {
    if (!interactive || e.button !== 0) return // left button only — leave right-click for the menu
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      phaseId: phase.id,
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origStart: phase.start,
      origEnd: phase.end,
      origLane: phase.lane,
    }
    setDraft({ phaseId: phase.id, start: phase.start, end: phase.end, lane: phase.lane })
  }

  function openMenu(e: React.MouseEvent, phase: FlatPhase) {
    if (!interactive) return
    e.preventDefault()
    e.stopPropagation()
    setMenu({ phase, x: e.clientX, y: e.clientY })
  }

  async function saveEdit(phase: FlatPhase, name: string, colour: string | null) {
    if (!onUpdatePhase) return
    try {
      await onUpdatePhase({ id: phase.id, name, colour })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update phase')
      throw err
    }
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
        <div className="flex items-center gap-3">
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
          {interactive && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Drag a bar to move it (up/down to change lane) · drag either edge to change dates
            </span>
          )}
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
              const eff = draft && draft.phaseId === p.id ? draft : p
              const isActive = draft?.phaseId === p.id
              const lane = isActive ? draft!.lane : p.lane
              const left = offsetPx(eff.start)
              const right = offsetPx(eff.end)
              const barWidth = Math.max(NOTCH * 2 + 8, right - left)
              const top = lane * LANE_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2
              return (
                <div key={p.id}>
                  {/* Chevron body — drag to move, right-click to edit */}
                  <div
                    onPointerDown={(e) => beginDrag(e, p, 'move')}
                    onContextMenu={(e) => openMenu(e, p)}
                    className="absolute flex select-none items-center justify-center px-4 text-xs font-medium text-white"
                    style={{
                      left,
                      top,
                      width: barWidth,
                      height: BAR_HEIGHT,
                      backgroundColor: p.colour,
                      clipPath: p.isFirst ? FIRST_CHEVRON_CLIP : CHEVRON_CLIP,
                      borderTopLeftRadius: p.isFirst ? 6 : 0,
                      borderBottomLeftRadius: p.isFirst ? 6 : 0,
                      cursor: interactive ? (isActive ? 'grabbing' : 'grab') : 'default',
                      touchAction: 'none',
                      opacity: isActive ? 0.85 : 1,
                      zIndex: isActive ? 15 : undefined,
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.25)' : undefined,
                    }}
                    title={`${p.rolloutName} · ${p.name}\n${format(eff.start, 'd MMM yyyy')} – ${format(eff.end, 'd MMM yyyy')}`}
                  >
                    <span className="truncate">
                      {p.isFirst && <Plus className="mr-1 inline h-3 w-3" />}
                      {p.name}
                    </span>
                  </div>

                  {/* Resize handles — drag to change start/end dates */}
                  {interactive && (
                    <>
                      <div
                        onPointerDown={(e) => beginDrag(e, p, 'resize-left')}
                        onContextMenu={(e) => openMenu(e, p)}
                        className="absolute z-10 rounded-sm hover:bg-black/15"
                        style={{
                          left: left - 1,
                          top,
                          width: HANDLE_WIDTH,
                          height: BAR_HEIGHT,
                          cursor: 'ew-resize',
                          touchAction: 'none',
                        }}
                        aria-label={`Adjust start date of ${p.name}`}
                      />
                      <div
                        onPointerDown={(e) => beginDrag(e, p, 'resize-right')}
                        onContextMenu={(e) => openMenu(e, p)}
                        className="absolute z-10 rounded-sm hover:bg-black/15"
                        style={{
                          left: left + barWidth - HANDLE_WIDTH - NOTCH + 1,
                          top,
                          width: HANDLE_WIDTH,
                          height: BAR_HEIGHT,
                          cursor: 'ew-resize',
                          touchAction: 'none',
                        }}
                        aria-label={`Adjust end date of ${p.name}`}
                      />
                    </>
                  )}

                  {/* Live date badge while dragging */}
                  {isActive && (
                    <div
                      className="pointer-events-none absolute z-20 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white shadow"
                      style={{ left, top: top - 22 }}
                    >
                      {format(eff.start, 'd MMM')} – {format(eff.end, 'd MMM yyyy')}
                    </div>
                  )}
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

      {/* Right-click context menu */}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onPointerDown={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu(null)
            }}
          />
          <div
            className="fixed z-50 min-w-40 overflow-hidden rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setEditing(menu.phase)
                setMenu(null)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit name &amp; colour…
            </button>
          </div>
        </>
      )}

      {/* Edit dialog — keyed by phase id so the form seeds fresh on each open */}
      {editing && (
        <PhaseEditDialog
          key={editing.id}
          phase={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  )
}

function PhaseEditDialog({
  phase,
  onClose,
  onSave,
}: {
  phase: FlatPhase
  onClose: () => void
  onSave: (phase: FlatPhase, name: string, colour: string | null) => Promise<void>
}) {
  const [name, setName] = useState(phase.name)
  const [colour, setColour] = useState(phase.colourOverride ?? phase.rolloutColour)
  const [usesLaneColour, setUsesLaneColour] = useState(phase.colourOverride === null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(phase, name.trim(), usesLaneColour ? null : colour)
      onClose()
    } catch {
      // toast already shown by onSave
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit phase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <Label htmlFor="edit-phase-name">Name</Label>
            <Input
              id="edit-phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label>Colour</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={colour}
                onChange={(e) => {
                  setColour(e.target.value)
                  setUsesLaneColour(false)
                }}
                className="h-9 w-14 cursor-pointer rounded border disabled:opacity-50"
                disabled={usesLaneColour}
                aria-label="Phase colour"
              />
              <div className="flex flex-wrap gap-1">
                {DEFAULT_COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use colour ${c}`}
                    onClick={() => {
                      setColour(c)
                      setUsesLaneColour(false)
                    }}
                    className="h-6 w-6 rounded-full border-2"
                    style={{
                      backgroundColor: c,
                      borderColor: !usesLaneColour && c.toLowerCase() === colour.toLowerCase() ? '#1A1A1A' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={usesLaneColour}
                onChange={(e) => setUsesLaneColour(e.target.checked)}
              />
              Use lane colour
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: phase.rolloutColour }} />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
