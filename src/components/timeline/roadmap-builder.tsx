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
import { Plus, Download, ZoomIn, Pencil, Trash2, Layers, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/empty-state'
import type { RolloutDTO } from '@/hooks/use-estimation'
import type { TimelineGroup } from '@/types'
import {
  DEFAULT_ROADMAP_BG,
  glossyGradientCss,
  gridColor,
  dividerColor,
  axisTextColor,
  axisSubTextColor,
  cardBorderColor,
} from '@/lib/roadmap-style'

const LANE_HEIGHT = 56
const BAR_HEIGHT = 36
const NOTCH = 16
const HANDLE_WIDTH = 10
const GROUP_ROW_HEIGHT = 26
const GROUP_BAND_HEIGHT = 18
const DEFAULT_COLOURS = ['#E87722', '#2196F3', '#2EB872', '#9C27B0', '#E6007E', '#F59E0B']
const BG_PRESETS = ['#FFFFFF', '#F4F6F8', '#FCE4F0', '#FFF7ED', '#1A1A1A', '#0F172A']

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `g_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
}

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Stable key for a go-live's stored vertical offset: phase + its date.
function glKey(phaseId: string, date: Date) {
  return `${phaseId}:${format(date, 'yyyy-MM-dd')}`
}
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

// Live drag state for a go-live diamond. Horizontal = date; vertical = a free
// pixel offset from the lane centre (persisted so it stays where you drop it).
interface GoLiveDrag {
  phaseId: string
  index: number
  startClientX: number
  startClientY: number
  origDate: Date
  origLane: number
  origOffsetY: number
}

interface GoLiveDraft {
  phaseId: string
  index: number
  date: Date
  offsetY: number
}

// Live drag state for a group band (vertical only; free pixel offset, persisted).
interface GroupDrag {
  id: string
  startClientY: number
  origOffsetY: number
  baseTop: number
  minTop: number
  maxTop: number
}

type UpdatePhase = (input: {
  id: string
  name?: string
  colour?: string | null
  startDate?: string
  endDate?: string
  rolloutId?: string
  sortOrder?: number
  goLives?: string[]
}) => Promise<unknown>

interface RoadmapBuilderProps {
  rollouts: RolloutDTO[]
  onUpdatePhase?: UpdatePhase
  onDeletePhase?: (phaseId: string) => Promise<unknown>
  groups?: TimelineGroup[]
  onSaveGroups?: (groups: TimelineGroup[]) => Promise<unknown>
  background?: string
  onUpdateBackground?: (background: string) => Promise<unknown>
  goLiveOffsets?: Record<string, number>
  onSaveGoLiveOffsets?: (offsets: Record<string, number>) => Promise<unknown>
}

export function RoadmapBuilder({
  rollouts,
  onUpdatePhase,
  onDeletePhase,
  groups: groupsProp,
  onSaveGroups,
  background,
  onUpdateBackground,
  goLiveOffsets: goLiveOffsetsProp,
  onSaveGoLiveOffsets,
}: RoadmapBuilderProps) {
  const [pxPerMonth, setPxPerMonth] = useState(90)
  const captureRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  // Card background — local for instant feedback, persisted through onUpdateBackground.
  const canEditBackground = Boolean(onUpdateBackground)
  const bgProp = background ?? DEFAULT_ROADMAP_BG
  const [cardBg, setCardBg] = useState(bgProp)
  const [prevBgProp, setPrevBgProp] = useState(bgProp)
  if (bgProp !== prevBgProp) {
    setPrevBgProp(bgProp)
    setCardBg(bgProp)
  }
  async function applyBackground(next: string) {
    setCardBg(next)
    if (!onUpdateBackground || next === bgProp) return
    try {
      await onUpdateBackground(next)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save background')
      setCardBg(bgProp)
    }
  }

  // Palette derived from the card background so axis text and gridlines stay legible.
  const gridCol = gridColor(cardBg)
  const dividerCol = dividerColor(cardBg)
  const axisText = axisTextColor(cardBg)
  const axisSub = axisSubTextColor(cardBg)

  // Right-click context menu + edit dialog state.
  const [menu, setMenu] = useState<{ phase: FlatPhase; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<FlatPhase | null>(null)
  const [deleting, setDeleting] = useState<FlatPhase | null>(null)

  // Group (bracket) annotations. Kept in local state for instant feedback, then
  // persisted through onSaveGroups; re-synced whenever the server copy changes.
  const canEditGroups = Boolean(onSaveGroups)
  const [editingGroup, setEditingGroup] = useState<TimelineGroup | null>(null)
  // Mirror the server groups locally for instant feedback; re-sync on change
  // (render-phase reset, matching the estimation panels).
  const groupsKey = JSON.stringify(groupsProp ?? [])
  const [prevGroupsKey, setPrevGroupsKey] = useState(groupsKey)
  const [groups, setGroups] = useState<TimelineGroup[]>(groupsProp ?? [])
  if (groupsKey !== prevGroupsKey) {
    setPrevGroupsKey(groupsKey)
    setGroups(groupsProp ?? [])
  }

  async function persistGroups(next: TimelineGroup[]) {
    setGroups(next)
    if (!onSaveGroups) return
    try {
      await onSaveGroups(next)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save groups')
      setGroups(groupsProp ?? [])
    }
  }

  // Live drag state. `draft` drives the visual position; `dragRef` holds the
  // immutable origin so pointer-move math is stable across re-renders.
  const [draft, setDraft] = useState<Draft | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const pxPerMonthRef = useRef(pxPerMonth)

  // Live drag state for go-live diamonds (parallel to the phase drag above).
  const [glDraft, setGlDraft] = useState<GoLiveDraft | null>(null)
  const glDraftRef = useRef<GoLiveDraft | null>(null)
  const glDragRef = useRef<GoLiveDrag | null>(null)
  // Right-click menu for an individual go-live diamond.
  const [glMenu, setGlMenu] = useState<{ phaseId: string; index: number; x: number; y: number } | null>(null)

  // Live drag state for a group band's vertical position.
  const [groupDraft, setGroupDraft] = useState<{ id: string; offsetY: number } | null>(null)
  const groupDraftRef = useRef<{ id: string; offsetY: number } | null>(null)
  const groupDragRef = useRef<GroupDrag | null>(null)
  const groupMovedRef = useRef(false)

  // Persisted vertical offsets for go-lives, mirrored locally for instant feedback
  // (render-phase reset, matching the groups/background panels).
  const offsetsKey = JSON.stringify(goLiveOffsetsProp ?? {})
  const [prevOffsetsKey, setPrevOffsetsKey] = useState(offsetsKey)
  const [glOffsets, setGlOffsets] = useState<Record<string, number>>(goLiveOffsetsProp ?? {})
  if (offsetsKey !== prevOffsetsKey) {
    setPrevOffsetsKey(offsetsKey)
    setGlOffsets(goLiveOffsetsProp ?? {})
  }
  const glOffsetsRef = useRef(glOffsets)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])
  useEffect(() => {
    glDraftRef.current = glDraft
  }, [glDraft])
  useEffect(() => {
    glOffsetsRef.current = glOffsets
  }, [glOffsets])
  useEffect(() => {
    groupDraftRef.current = groupDraft
  }, [groupDraft])
  useEffect(() => {
    pxPerMonthRef.current = pxPerMonth
  }, [pxPerMonth])

  // Close any open context menu on Escape.
  useEffect(() => {
    if (!menu && !glMenu) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenu(null)
        setGlMenu(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu, glMenu])

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
    if (glDraft) {
      if (glDraft.date < min) min = glDraft.date
      if (glDraft.date > max) max = glDraft.date
    }
    const axisStart = startOfMonth(min)
    const totalMonths = differenceInCalendarMonths(max, axisStart) + 1
    const months = Array.from({ length: totalMonths }, (_, i) => addMonths(axisStart, i))

    return { phases: valid, axisStart, totalMonths, months, lanes: rollouts.length }
  }, [rollouts, draft, glDraft])

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

  // Window-level pointer listeners for a go-live drag. Horizontal moves the date
  // (day granularity); vertical is a free pixel offset from the lane centre.
  const isGlDragging = glDraft !== null
  useEffect(() => {
    if (!isGlDragging || !onUpdatePhase) return

    const laneCount = rollouts.length
    const laneCentre = (lane: number) => lane * LANE_HEIGHT + LANE_HEIGHT / 2
    // Keep the diamond within the lanes area.
    const minCentre = 7
    const maxCentre = laneCount * LANE_HEIGHT + 1

    function onMove(e: PointerEvent) {
      const d = glDragRef.current
      if (!d) return
      const pxPerDay = pxPerMonthRef.current / 30
      const deltaDays = Math.round((e.clientX - d.startClientX) / pxPerDay)
      const rawCentre = laneCentre(d.origLane) + d.origOffsetY + (e.clientY - d.startClientY)
      const centre = Math.min(Math.max(minCentre, rawCentre), maxCentre)
      setGlDraft({
        phaseId: d.phaseId,
        index: d.index,
        date: addDays(d.origDate, deltaDays),
        offsetY: centre - laneCentre(d.origLane),
      })
    }

    async function onUp() {
      const d = glDragRef.current
      const current = glDraftRef.current
      glDragRef.current = null
      if (d && current) {
        const sourcePhase = rollouts.flatMap((ro) => ro.phases).find((p) => p.id === d.phaseId)
        const dateChanged = current.date.getTime() !== d.origDate.getTime()
        const offset = Math.round(current.offsetY)
        const offsetChanged = offset !== Math.round(d.origOffsetY)
        try {
          if (sourcePhase && dateChanged) {
            const dates = sourcePhase.goLives.map((s) => s.slice(0, 10))
            dates[d.index] = format(current.date, 'yyyy-MM-dd')
            await onUpdatePhase!({ id: sourcePhase.id, goLives: Array.from(new Set(dates)) })
          }
          if (onSaveGoLiveOffsets && (offsetChanged || dateChanged)) {
            // Migrate the stored offset to the (possibly new) date key.
            const next = { ...glOffsetsRef.current }
            delete next[glKey(d.phaseId, d.origDate)]
            if (offset !== 0) next[glKey(d.phaseId, current.date)] = offset
            setGlOffsets(next)
            try {
              await onSaveGoLiveOffsets(next)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to save go-live position')
              setGlOffsets(goLiveOffsetsProp ?? {})
            }
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to move go-live')
        }
      }
      setGlDraft(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGlDragging])

  // Window-level pointer listeners for a group band's vertical drag. A drag moves
  // the band's offset; a click (no movement) opens the group editor.
  const isGroupDragging = groupDraft !== null
  useEffect(() => {
    if (!isGroupDragging || !onSaveGroups) return

    function onMove(e: PointerEvent) {
      const d = groupDragRef.current
      if (!d) return
      if (Math.abs(e.clientY - d.startClientY) > 4) groupMovedRef.current = true
      const top = Math.min(
        Math.max(d.minTop, d.baseTop + d.origOffsetY + (e.clientY - d.startClientY)),
        d.maxTop
      )
      setGroupDraft({ id: d.id, offsetY: top - d.baseTop })
    }

    async function onUp() {
      const d = groupDragRef.current
      const current = groupDraftRef.current
      const moved = groupMovedRef.current
      groupDragRef.current = null
      groupMovedRef.current = false
      if (d && current) {
        if (moved) {
          const next = groups.map((g) =>
            g.id === d.id ? { ...g, offsetY: Math.round(current.offsetY) } : g
          )
          await persistGroups(next)
        } else {
          // Treated as a click — open the editor.
          const g = groups.find((x) => x.id === d.id)
          if (g) setEditingGroup(g)
        }
      }
      setGroupDraft(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroupDragging])

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

  // Group brackets: each spans from the earliest start to the latest end of its
  // member phases. Bands follow a phase mid-drag so they stay aligned. A group
  // with no resolvable phases still renders as a full-width placeholder so it
  // stays visible and editable (rather than silently disappearing).
  const phaseById = new Map(phases.map((p) => [p.id, p]))
  const groupBands = groups.map((g) => {
    const members = g.phaseIds
      .map((pid) => phaseById.get(pid))
      .filter((p): p is FlatPhase => Boolean(p))
      .map((p) => (draft && draft.phaseId === p.id ? { ...p, start: draft.start, end: draft.end } : p))
    if (members.length === 0) {
      return { group: g, left: 0, right: width, empty: true }
    }
    let s = members[0].start
    let e = members[0].end
    for (const m of members) {
      if (m.start < s) s = m.start
      if (m.end > e) e = m.end
    }
    return { group: g, left: offsetPx(s), right: offsetPx(e), empty: false }
  })

  // Group bands are an overlay that defaults to just BELOW the lanes (no reserved
  // strip above, so adding a group never opens a gap at the top). offsetY moves a
  // band from that default; legacy offsets that fall outside the sane range heal
  // back to the default so old data lays out cleanly too.
  const nGroups = groupBands.length
  const GROUP_TOP_GAP = 6
  const groupBaseTop = (i: number) => lanes * LANE_HEIGHT + GROUP_TOP_GAP + i * GROUP_ROW_HEIGHT
  const groupClampMax = lanes * LANE_HEIGHT + GROUP_TOP_GAP + (nGroups + 1) * GROUP_ROW_HEIGHT
  const healGroupOffset = (i: number, off: number) => {
    const raw = groupBaseTop(i) + off
    return raw >= 0 && raw <= groupClampMax ? off : 0
  }
  const groupEffTop = (i: number, b: (typeof groupBands)[number]) =>
    groupBaseTop(i) +
    (groupDraft?.id === b.group.id ? groupDraft.offsetY : healGroupOffset(i, b.group.offsetY ?? 0))
  const lanesContentBottom = groupBands.reduce(
    (lo, b, i) => Math.max(lo, groupEffTop(i, b) + GROUP_BAND_HEIGHT),
    lanes * LANE_HEIGHT
  )
  const lanesContainerHeight = Math.max(lanes * LANE_HEIGHT + 8, lanesContentBottom + 4)

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

  function findPhaseDTO(phaseId: string) {
    for (const ro of rollouts) {
      const f = ro.phases.find((p) => p.id === phaseId)
      if (f) return f
    }
    return undefined
  }

  function beginGlDrag(
    e: React.PointerEvent,
    phaseId: string,
    index: number,
    date: Date,
    lane: number,
    offsetY: number
  ) {
    if (!interactive || e.button !== 0) return // left button only — right-click opens its menu
    e.preventDefault()
    e.stopPropagation()
    glDragRef.current = {
      phaseId,
      index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origDate: date,
      origLane: lane,
      origOffsetY: offsetY,
    }
    setGlDraft({ phaseId, index, date, offsetY })
  }

  function beginGroupDrag(e: React.PointerEvent, group: TimelineGroup, baseTop: number, startOffsetY: number) {
    if (!canEditGroups || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    groupMovedRef.current = false
    groupDragRef.current = {
      id: group.id,
      startClientY: e.clientY,
      origOffsetY: startOffsetY,
      baseTop,
      minTop: 0, // top of the lanes (a band may overlay the bars)
      maxTop: groupClampMax,
    }
    setGroupDraft({ id: group.id, offsetY: startOffsetY })
  }

  async function addGoLive(phase: FlatPhase) {
    if (!onUpdatePhase) return
    const dto = findPhaseDTO(phase.id)
    const dates = dto ? dto.goLives.map((s) => s.slice(0, 10)) : []
    // Default to the phase's start month; fall back to the end month if taken.
    let candidate = format(startOfMonth(phase.start), 'yyyy-MM-dd')
    if (dates.includes(candidate)) candidate = format(startOfMonth(phase.end), 'yyyy-MM-dd')
    if (dates.includes(candidate)) {
      toast.info('A go-live already exists for those months — drag it instead.')
      return
    }
    try {
      await onUpdatePhase({ id: phase.id, goLives: [...dates, candidate] })
      toast.success('Go-live added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add go-live')
    }
  }

  async function removeGoLive(phaseId: string, index: number) {
    if (!onUpdatePhase) return
    const dto = findPhaseDTO(phaseId)
    if (!dto) return
    const removed = dto.goLives[index]
    const next = dto.goLives.map((s) => s.slice(0, 10)).filter((_, i) => i !== index)
    try {
      await onUpdatePhase({ id: phaseId, goLives: next })
      toast.success('Go-live removed')
      // Drop any stored vertical offset for the removed go-live.
      const key = removed ? glKey(phaseId, new Date(removed)) : null
      if (onSaveGoLiveOffsets && key && key in glOffsets) {
        const nextOffsets = { ...glOffsets }
        delete nextOffsets[key]
        setGlOffsets(nextOffsets)
        void onSaveGoLiveOffsets(nextOffsets)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove go-live')
    }
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

  async function handleDeletePhase(phase: FlatPhase) {
    if (!onDeletePhase) return
    try {
      await onDeletePhase(phase.id)
      toast.success('Phase deleted')
      // Drop the deleted phase from any group that referenced it.
      const cleaned = groups.map((g) => ({
        ...g,
        phaseIds: g.phaseIds.filter((pid) => pid !== phase.id),
      }))
      if (JSON.stringify(cleaned) !== JSON.stringify(groups)) void persistGroups(cleaned)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete phase')
    } finally {
      setDeleting(null)
    }
  }

  async function saveGroup(g: TimelineGroup) {
    const exists = groups.some((x) => x.id === g.id)
    const next = exists ? groups.map((x) => (x.id === g.id ? g : x)) : [...groups, g]
    await persistGroups(next)
  }

  async function deleteGroup(id: string) {
    await persistGroups(groups.filter((x) => x.id !== id))
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
      const dataUrl = await toPng(captureRef.current, { backgroundColor: cardBg, pixelRatio: 2 })
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
              Drag a bar to move it (up/down to change lane) · drag either edge to change dates ·
              right-click a bar to add a go-live, then drag the diamond to reposition (up/down to move it above/below the bar)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEditBackground && (
            <div className="flex items-center gap-1.5" title="Roadmap card background">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <input
                type="color"
                value={cardBg}
                onChange={(e) => setCardBg(e.target.value)}
                onBlur={(e) => applyBackground(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border p-0"
                aria-label="Roadmap background colour"
              />
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Background ${preset}`}
                  onClick={() => applyBackground(preset)}
                  className="h-6 w-6 rounded-full border"
                  style={{
                    background: glossyGradientCss(preset),
                    borderColor: preset.toLowerCase() === cardBg.toLowerCase() ? '#E6007E' : '#D9D9D9',
                    borderWidth: preset.toLowerCase() === cardBg.toLowerCase() ? 2 : 1,
                  }}
                />
              ))}
            </div>
          )}
          {canEditGroups && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditingGroup({
                  id: newId(),
                  label: 'New group',
                  colour: DEFAULT_COLOURS[groups.length % DEFAULT_COLOURS.length],
                  phaseIds: [],
                })
              }
            >
              <Layers className="h-4 w-4" />
              Add group
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export PNG'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: cardBorderColor(cardBg) }}>
        <div ref={captureRef} className="min-w-fit p-4" style={{ background: glossyGradientCss(cardBg) }}>
          {/* Year + month header */}
          <div style={{ width, marginLeft: 0 }}>
            <div className="flex" style={{ borderBottom: `1px solid ${gridCol}` }}>
              {yearGroups.map((g, gi) => (
                <div
                  key={g.year}
                  style={{
                    width: g.count * pxPerMonth,
                    color: axisText,
                    borderLeft: gi === 0 ? 'none' : `1px solid ${dividerCol}`,
                  }}
                  className="py-1 text-center text-xs font-semibold"
                >
                  {g.year}
                </div>
              ))}
            </div>
            <div className="flex" style={{ borderBottom: `1px solid ${gridCol}` }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{
                    width: pxPerMonth,
                    color: axisSub,
                    borderLeft: i === 0 ? 'none' : `1px solid ${gridCol}`,
                  }}
                  className="py-1 text-center text-[10px]"
                >
                  {format(m, 'MMM')}
                </div>
              ))}
            </div>
          </div>

          {/* Lanes (group brackets are overlaid below the bars, no reserved strip) */}
          <div className="relative" style={{ width, height: lanesContainerHeight }}>
            {/* Month gridlines */}
            {months.map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0"
                style={{ left: i * pxPerMonth, borderLeft: `1px dashed ${gridCol}` }}
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

            {/* Go-live diamonds — drag to move (snaps to month), right-click to remove */}
            {phases.flatMap((p) =>
              p.goLives.map((gl, idx) => {
                const isGlActive = glDraft?.phaseId === p.id && glDraft.index === idx
                const effDate = isGlActive ? glDraft!.date : gl
                const storedOffset = glOffsets[glKey(p.id, gl)] ?? 0
                const effOffset = isGlActive ? glDraft!.offsetY : storedOffset
                const left = offsetPx(effDate)
                const top = p.lane * LANE_HEIGHT + LANE_HEIGHT / 2 + effOffset
                return (
                  <div key={`${p.id}-gl-${idx}`}>
                    <div
                      onPointerDown={(e) => beginGlDrag(e, p.id, idx, gl, p.lane, storedOffset)}
                      onContextMenu={(e) => {
                        if (!interactive) return
                        e.preventDefault()
                        e.stopPropagation()
                        setGlMenu({ phaseId: p.id, index: idx, x: e.clientX, y: e.clientY })
                      }}
                      className="absolute"
                      title={`Go-live: ${format(effDate, 'd MMM yyyy')}${interactive ? ' · drag to move, right-click to remove' : ''}`}
                      style={{
                        left: left - 7,
                        top: top - 7,
                        width: 14,
                        height: 14,
                        backgroundColor: '#2EB872',
                        transform: 'rotate(45deg)',
                        border: '2px solid white',
                        zIndex: isGlActive ? 25 : 20,
                        cursor: interactive ? (isGlActive ? 'grabbing' : 'grab') : 'default',
                        touchAction: 'none',
                        boxShadow: isGlActive ? '0 2px 8px rgba(0,0,0,0.3)' : undefined,
                      }}
                    />
                    {isGlActive && (
                      <div
                        className="pointer-events-none absolute z-30 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white shadow"
                        style={{ left: left + 10, top: top - 9 }}
                      >
                        {format(effDate, 'd MMM yyyy')}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Group brackets — overlaid below the bars by default. Drag a band
                up/down to reposition; click (no drag) to edit. */}
            {groupBands.map((b, i) => {
              const bandWidth = Math.max(GROUP_BAND_HEIGHT, b.right - b.left)
              const isActive = groupDraft?.id === b.group.id
              const healed = healGroupOffset(i, b.group.offsetY ?? 0)
              return (
                <div
                  key={b.group.id}
                  onPointerDown={
                    canEditGroups ? (e) => beginGroupDrag(e, b.group, groupBaseTop(i), healed) : undefined
                  }
                  className="absolute flex select-none items-center gap-1.5 overflow-hidden rounded-md border px-2 text-[11px] font-semibold"
                  style={{
                    left: b.left,
                    top: groupEffTop(i, b),
                    width: bandWidth,
                    height: GROUP_BAND_HEIGHT,
                    backgroundColor: hexToRgba(b.group.colour, b.empty ? 0.08 : 0.16),
                    borderColor: b.group.colour,
                    borderStyle: b.empty ? 'dashed' : 'solid',
                    color: '#1A1A1A',
                    cursor: canEditGroups ? (isActive ? 'grabbing' : 'grab') : 'default',
                    touchAction: 'none',
                    zIndex: isActive ? 30 : 18,
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.25)' : undefined,
                  }}
                  title={
                    b.empty
                      ? `“${b.group.label}” has no phases yet — click to add some`
                      : canEditGroups
                        ? `Drag to move · click to edit “${b.group.label}”`
                        : b.group.label
                  }
                >
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: b.group.colour }} />
                  <span className="truncate">
                    {b.group.label}
                    {b.empty && <span className="font-normal opacity-70"> · no phases yet</span>}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 pt-3" style={{ color: axisText, borderTop: `1px solid ${gridCol}` }}>
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
            {groups.map((g) =>
              canEditGroups ? (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setEditingGroup(g)}
                  className="flex items-center gap-1.5 text-xs hover:underline"
                  title={`Edit group “${g.label}”`}
                >
                  <span
                    className="h-3 w-3 rounded-sm border"
                    style={{ backgroundColor: hexToRgba(g.colour, 0.16), borderColor: g.colour }}
                  />
                  {g.label || 'Untitled group'}
                </button>
              ) : (
                <div key={g.id} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-3 w-3 rounded-sm border"
                    style={{ backgroundColor: hexToRgba(g.colour, 0.16), borderColor: g.colour }}
                  />
                  {g.label || 'Untitled group'}
                </div>
              )
            )}
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
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                void addGoLive(menu.phase)
                setMenu(null)
              }}
            >
              <span className="h-3.5 w-3.5 rotate-45 border border-white" style={{ backgroundColor: '#2EB872' }} />
              Add go-live
            </button>
            {onDeletePhase && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
                onClick={() => {
                  setDeleting(menu.phase)
                  setMenu(null)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete phase…
              </button>
            )}
          </div>
        </>
      )}

      {/* Right-click menu for a go-live diamond */}
      {glMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onPointerDown={() => setGlMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setGlMenu(null)
            }}
          />
          <div
            className="fixed z-50 min-w-40 overflow-hidden rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
            style={{ left: glMenu.x, top: glMenu.y }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
              onClick={() => {
                void removeGoLive(glMenu.phaseId, glMenu.index)
                setGlMenu(null)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove go-live
            </button>
          </div>
        </>
      )}

      {/* Delete-phase confirmation — removes the phase and its allocations everywhere */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete phase?</DialogTitle>
            <DialogDescription>
              Delete “{deleting?.name}” and its allocations. This also removes it from the
              Estimation tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleting && handleDeletePhase(deleting)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group editor — create / rename / recolour / pick member phases / delete */}
      {editingGroup && (
        <GroupEditDialog
          key={editingGroup.id}
          group={editingGroup}
          rollouts={rollouts}
          onClose={() => setEditingGroup(null)}
          onSave={saveGroup}
          onDelete={deleteGroup}
        />
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

function GroupEditDialog({
  group,
  rollouts,
  onClose,
  onSave,
  onDelete,
}: {
  group: TimelineGroup
  rollouts: RolloutDTO[]
  onClose: () => void
  onSave: (group: TimelineGroup) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [label, setLabel] = useState(group.label)
  const [colour, setColour] = useState(group.colour)
  const [phaseIds, setPhaseIds] = useState<Set<string>>(new Set(group.phaseIds))
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  function togglePhase(id: string) {
    setPhaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    try {
      await onSave({ ...group, label: label.trim(), colour, phaseIds: Array.from(phaseIds) })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await onDelete(group.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const hasPhases = rollouts.some((ro) => ro.phases.length > 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit group</DialogTitle>
          <DialogDescription>
            A group draws a labelled bracket spanning the phases you select.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <Label htmlFor="group-label">Label</Label>
            <Input
              id="group-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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
                onChange={(e) => setColour(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border"
                aria-label="Group colour"
              />
              <div className="flex flex-wrap gap-1">
                {DEFAULT_COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use colour ${c}`}
                    onClick={() => setColour(c)}
                    className="h-6 w-6 rounded-full border-2"
                    style={{
                      backgroundColor: c,
                      borderColor: c.toLowerCase() === colour.toLowerCase() ? '#1A1A1A' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Phases in this group</Label>
            {hasPhases ? (
              <div className="mt-1 max-h-56 space-y-3 overflow-y-auto rounded-md border p-3">
                {rollouts.map((ro) => (
                  <div key={ro.id}>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ro.colour }} />
                      {ro.name}
                    </div>
                    {ro.phases.length === 0 ? (
                      <p className="pl-4 text-xs text-muted-foreground">No phases</p>
                    ) : (
                      ro.phases.map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-2 py-0.5 pl-4 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={phaseIds.has(p.id)}
                            onChange={() => togglePhase(p.id)}
                          />
                          {p.name}
                        </label>
                      ))
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Add phases in the Estimation tab first.
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" />
              {busy ? 'Deleting…' : 'Delete group'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !label.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
