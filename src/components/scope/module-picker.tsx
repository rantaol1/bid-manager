'use client'

import { Check } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { IFS_MODULES, IFS_CATEGORIES } from '@/lib/constants/ifs-modules'
import type { ScopeModules, FitGap } from '@/types'

interface Props {
  modules: ScopeModules
  onChange: (modules: ScopeModules) => void
}

const FIT_GAP_OPTIONS: { value: FitGap; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 'partial', label: 'Partial' },
  { value: 'gap', label: 'Gap' },
]

export function ModulePicker({ modules, onChange }: Props) {
  function toggle(id: string) {
    const current = modules[id]
    onChange({
      ...modules,
      [id]: { selected: !current?.selected, fitGap: current?.fitGap ?? 'fit', notes: current?.notes },
    })
  }

  function setFitGap(id: string, fitGap: FitGap) {
    onChange({ ...modules, [id]: { ...modules[id], selected: true, fitGap } })
  }

  return (
    <div className="space-y-6">
      {IFS_CATEGORIES.map((category) => {
        const mods = IFS_MODULES.filter((m) => m.category === category)
        return (
          <div key={category}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mods.map((mod) => {
                const state = modules[mod.id]
                const selected = state?.selected
                return (
                  <div
                    key={mod.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      selected ? 'border-magenta bg-magenta/5' : 'bg-background hover:bg-accent'
                    )}
                  >
                    <button type="button" onClick={() => toggle(mod.id)} className="flex w-full items-start gap-2 text-left">
                      <span
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          selected ? 'border-magenta bg-magenta text-white' : 'border-input'
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span>
                        <span className="block text-sm font-medium">{mod.name}</span>
                        <span className="block text-xs text-muted-foreground">{mod.description}</span>
                      </span>
                    </button>
                    {selected && (
                      <div className="mt-2 pl-6">
                        <Select value={state?.fitGap ?? 'fit'} onValueChange={(v) => v && setFitGap(mod.id, v as FitGap)}>
                          <SelectTrigger size="sm" className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIT_GAP_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
