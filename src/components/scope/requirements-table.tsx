'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/common/empty-state'
import { IFS_MODULES } from '@/lib/constants/ifs-modules'
import type { ScopeRequirement, FitGap } from '@/types'

const PRIORITIES = ['must', 'should', 'could', 'wont'] as const
const FIT_GAPS: FitGap[] = ['fit', 'partial', 'gap']

function newId() {
  return `req-${Math.random().toString(36).slice(2, 10)}`
}

interface Props {
  requirements: ScopeRequirement[]
  onChange: (requirements: ScopeRequirement[]) => void
}

export function RequirementsTable({ requirements, onChange }: Props) {
  function update(id: string, patch: Partial<ScopeRequirement>) {
    onChange(requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  function remove(id: string) {
    onChange(requirements.filter((r) => r.id !== id))
  }
  function add() {
    onChange([...requirements, { id: newId(), title: '', priority: 'should', fitGap: 'fit' }])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Requirements ({requirements.length})</h4>
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Add requirement
        </Button>
      </div>
      {requirements.length === 0 ? (
        <EmptyState message="No requirements yet" hint="Add requirements and tag them by module, priority and fit/gap." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Requirement</TableHead>
                <TableHead className="w-44">Module</TableHead>
                <TableHead className="w-32">Priority</TableHead>
                <TableHead className="w-28">Fit/Gap</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Input value={req.title} onChange={(e) => update(req.id, { title: e.target.value })} placeholder="Requirement title" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={req.moduleId ?? ''}
                      onValueChange={(v) => update(req.id, { moduleId: v || undefined })}
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {IFS_MODULES.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={req.priority} onValueChange={(v) => v && update(req.id, { priority: v as ScopeRequirement['priority'] })}>
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={req.fitGap} onValueChange={(v) => v && update(req.id, { fitGap: v as FitGap })}>
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIT_GAPS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(req.id)} aria-label="Remove requirement">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
