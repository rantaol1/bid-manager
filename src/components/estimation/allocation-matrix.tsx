'use client'

import { memo } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { daysForAllocation } from '@/lib/estimation'
import type { RolloutDTO, RoleConfigDTO } from '@/hooks/use-estimation'

export function allocKey(phaseId: string, roleId: string) {
  return `${phaseId}:${roleId}`
}

interface Props {
  rollouts: RolloutDTO[]
  roles: RoleConfigDTO[]
  draft: Record<string, string>
  onChange: (phaseId: string, roleId: string, value: string) => void
  onSave: () => void
  saving: boolean
}

const Cell = memo(function Cell({
  phaseId,
  roleId,
  value,
  onChange,
}: {
  phaseId: string
  roleId: string
  value: string
  onChange: (phaseId: string, roleId: string, value: string) => void
}) {
  return (
    <Input
      type="number"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(phaseId, roleId, e.target.value)}
      className="h-8 w-16 px-2 text-center"
    />
  )
})

export function AllocationMatrix({ rollouts, roles, draft, onChange, onSave, saving }: Props) {
  const phases = rollouts.flatMap((ro) => ro.phases.map((p) => ({ ...p, rolloutName: ro.name })))

  if (roles.length === 0 || phases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Allocation matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            message="Add roles and phases first"
            hint="The allocation grid appears once you have at least one role and one phase."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Allocation matrix (%)</CardTitle>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save allocations'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background p-2 text-left font-medium">Phase</th>
                {roles.map((r) => (
                  <th key={r.id} className="min-w-20 p-2 text-center font-medium">
                    {r.roleName}
                  </th>
                ))}
                <th className="p-2 text-right font-medium">Days</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) => {
                let phaseDays = 0
                for (const role of roles) {
                  const pct = Number(draft[allocKey(phase.id, role.id)] ?? 0)
                  phaseDays += daysForAllocation(pct, phase.workingDays)
                }
                return (
                  <tr key={phase.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-background p-2 whitespace-nowrap">
                      <span className="text-muted-foreground">{phase.rolloutName} · </span>
                      {phase.name}
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="p-1 text-center">
                        <Cell
                          phaseId={phase.id}
                          roleId={role.id}
                          value={draft[allocKey(phase.id, role.id)] ?? ''}
                          onChange={onChange}
                        />
                      </td>
                    ))}
                    <td className="p-2 text-right font-medium">{phaseDays.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
