'use client'

import { useState } from 'react'
import { Plus, Trash2, Eraser, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  FUNCTIONAL_GROUPS,
  TECHNICAL_SECTIONS,
  PLATFORM_TILES,
  IFS_AI_FOUNDATION,
  DEPLOYMENT_LABEL,
  type ScopeTile,
} from '@/lib/constants/ifs-modules'
import type { ScopeModules, ScopePhase } from '@/types'

interface Props {
  modules: ScopeModules
  phases: ScopePhase[]
  onChangeModules: (modules: ScopeModules) => void
  onChangePhases: (phases: ScopePhase[]) => void
}

const PANEL_BG = 'linear-gradient(125deg, #4a1d6e 0%, #2a1257 48%, #141038 100%)'
const UNSET_COLOUR = '#FFFFFF'

/** Black or white text depending on the tile's background luminance. */
function readableText(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#1A1A1A'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1A1A1A' : '#FFFFFF'
}

function randomPhaseId() {
  return `ph-${Math.random().toString(36).slice(2, 9)}`
}

function TileButton({
  tile,
  colour,
  onClick,
  heightPx,
}: {
  tile: ScopeTile
  colour: string
  onClick: () => void
  heightPx?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tile.name}
      className={cn(
        'flex w-full items-center justify-center overflow-hidden rounded-md px-2 py-1 text-center text-[10px] font-medium leading-snug shadow-sm transition hover:ring-2 hover:ring-white/70',
        heightPx ? '' : 'h-full'
      )}
      style={{
        backgroundColor: colour,
        color: readableText(colour),
        height: heightPx,
        minHeight: heightPx ? undefined : 36,
      }}
    >
      {tile.name}
    </button>
  )
}

export function SolutionMap({ modules, phases, onChangeModules, onChangePhases }: Props) {
  // `null` brush = eraser (clears a tile's phase).
  const [activePhaseId, setActivePhaseId] = useState<string | null>(phases[0]?.id ?? null)
  const [editMode, setEditMode] = useState(false)

  const phaseById = new Map(phases.map((p) => [p.id, p]))

  function tileColour(tileId: string): string {
    const phaseId = modules[tileId]?.phaseId
    const phase = phaseId ? phaseById.get(phaseId) : undefined
    return phase ? phase.colour : UNSET_COLOUR
  }

  function paintTile(tileId: string) {
    const current = modules[tileId]
    const clearing = activePhaseId === null || current?.phaseId === activePhaseId
    if (clearing) {
      onChangeModules({ ...modules, [tileId]: { ...current, selected: false, phaseId: undefined } })
    } else {
      onChangeModules({
        ...modules,
        [tileId]: { selected: true, phaseId: activePhaseId, fitGap: current?.fitGap ?? 'fit', notes: current?.notes },
      })
    }
  }

  function addPhase() {
    onChangePhases([...phases, { id: randomPhaseId(), label: 'New phase', colour: '#8B5CF6' }])
  }

  function updatePhase(id: string, patch: Partial<ScopePhase>) {
    onChangePhases(phases.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removePhase(id: string) {
    onChangePhases(phases.filter((p) => p.id !== id))
    // Unassign any tiles that pointed at the removed phase.
    const next: ScopeModules = {}
    for (const [tileId, state] of Object.entries(modules)) {
      next[tileId] = state.phaseId === id ? { ...state, selected: false, phaseId: undefined } : state
    }
    onChangeModules(next)
    if (activePhaseId === id) setActivePhaseId(null)
  }

  const renderTile = (tile: ScopeTile, heightPx?: number) => (
    <TileButton key={tile.id} tile={tile} colour={tileColour(tile.id)} onClick={() => paintTile(tile.id)} heightPx={heightPx} />
  )

  return (
    <div className="overflow-x-auto rounded-xl" style={{ background: PANEL_BG }}>
      <div className="min-w-[1800px] space-y-5 p-6">
        {/* Header: legend / phase brush + title */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {phases.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePhaseId(p.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium text-white transition',
                    activePhaseId === p.id ? 'bg-white/15 ring-2 ring-white' : 'bg-white/5 hover:bg-white/10'
                  )}
                >
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.colour }} />
                  {p.label}
                  {activePhaseId === p.id && <Check className="h-3 w-3" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActivePhaseId(null)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-white transition',
                  activePhaseId === null ? 'bg-white/15 ring-2 ring-white' : 'bg-white/5 hover:bg-white/10'
                )}
              >
                <Eraser className="h-3 w-3" />
                Clear
              </button>
            </div>
            <p className="text-xs text-white/60">
              {activePhaseId === null
                ? 'Eraser active — click a tile to remove its phase.'
                : `Painting with “${phaseById.get(activePhaseId)?.label}” — click tiles to assign this phase.`}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-white">Solution Set Overview</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditMode((v) => !v)}
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editMode ? 'Done editing phases' : 'Edit phases'}
            </Button>
          </div>
        </div>

        {/* Phase editor */}
        {editMode && (
          <div className="space-y-2 rounded-lg border border-white/15 bg-black/20 p-3">
            {phases.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={p.colour}
                  onChange={(e) => updatePhase(p.id, { colour: e.target.value })}
                  className="h-8 w-10 shrink-0 cursor-pointer rounded border border-white/20 bg-transparent"
                  aria-label={`${p.label} colour`}
                />
                <Input
                  value={p.label}
                  onChange={(e) => updatePhase(p.id, { label: e.target.value })}
                  className="h-8 max-w-xs border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  placeholder="Phase name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePhase(p.id)}
                  aria-label={`Remove ${p.label}`}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPhase}
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add phase
            </Button>
          </div>
        )}

        {/* Functional Layer */}
        <div className="flex gap-5">
          <div className="flex w-28 shrink-0 items-center pr-2">
            <span className="text-sm font-bold uppercase leading-snug tracking-wide text-white">Functional Layer</span>
          </div>
          <div className="flex flex-1 items-stretch gap-5">
            {FUNCTIONAL_GROUPS.map((group) => (
              <div key={group.id} className="flex flex-col">
                <div className="flex flex-1 gap-2.5">
                  {group.columns.map((col, ci) => (
                    <div key={ci} className="flex w-[132px] flex-col justify-end gap-2">
                      {col.map((tile) => renderTile(tile, 46))}
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 text-center text-[11px] font-semibold leading-tight text-cyan-300">
                  {group.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-dashed border-white/25" />

        {/* Platform & Technical Layer */}
        <div className="flex gap-4">
          <div className="flex w-24 shrink-0 items-center">
            <span className="text-sm font-bold leading-tight text-white">Platform &amp; Technical Layer</span>
          </div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              {TECHNICAL_SECTIONS.map((section) => (
                <div key={section.id}>
                  <div className="mb-1.5 text-xs font-semibold text-white">{section.label}</div>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${section.tiles.length}, minmax(0, 1fr))` }}
                  >
                    {section.tiles.map((tile) => renderTile(tile))}
                  </div>
                </div>
              ))}
            </div>

            {renderTile(IFS_AI_FOUNDATION)}

            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${PLATFORM_TILES.length}, minmax(0, 1fr))` }}>
              {PLATFORM_TILES.map((tile) => renderTile(tile))}
            </div>

            <div className="rounded-md bg-[#160f33] py-2 text-center text-sm font-bold text-white ring-1 ring-white/15">
              {DEPLOYMENT_LABEL}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
