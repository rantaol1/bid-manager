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
import type { ScopeRisk } from '@/types'

const LEVELS = ['low', 'medium', 'high'] as const
type Level = (typeof LEVELS)[number]

function newId() {
  return `risk-${Math.random().toString(36).slice(2, 10)}`
}

interface Props {
  risks: ScopeRisk[]
  onChange: (risks: ScopeRisk[]) => void
}

export function RiskRegister({ risks, onChange }: Props) {
  function update(id: string, patch: Partial<ScopeRisk>) {
    onChange(risks.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  function remove(id: string) {
    onChange(risks.filter((r) => r.id !== id))
  }
  function add() {
    onChange([...risks, { id: newId(), title: '', likelihood: 'medium', impact: 'medium', mitigation: '' }])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Risk register ({risks.length})</h4>
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Add risk
        </Button>
      </div>
      {risks.length === 0 ? (
        <EmptyState message="No risks logged" hint="Capture delivery risks with likelihood, impact and mitigation." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Risk</TableHead>
                <TableHead className="w-28">Likelihood</TableHead>
                <TableHead className="w-28">Impact</TableHead>
                <TableHead className="min-w-56">Mitigation</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell>
                    <Input value={risk.title} onChange={(e) => update(risk.id, { title: e.target.value })} placeholder="Risk title" />
                  </TableCell>
                  <TableCell>
                    <Select value={risk.likelihood} onValueChange={(v) => v && update(risk.id, { likelihood: v as Level })}>
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l.charAt(0).toUpperCase() + l.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={risk.impact} onValueChange={(v) => v && update(risk.id, { impact: v as Level })}>
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l.charAt(0).toUpperCase() + l.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={risk.mitigation ?? ''}
                      onChange={(e) => update(risk.id, { mitigation: e.target.value })}
                      placeholder="Mitigation"
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(risk.id)} aria-label="Remove risk">
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
