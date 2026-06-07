'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import { useRateCard, useSaveRateCard, type RateCardRole } from '@/hooks/use-rate-card'

export default function RateCardPage() {
  const { data, isLoading, error } = useRateCard()
  const save = useSaveRateCard()
  const isAdmin = useIsAdmin()
  const [rows, setRows] = useState<RateCardRole[]>([])
  const seededRef = useRef(false)

  useEffect(() => {
    if (!seededRef.current && data) {
      setRows(data)
      seededRef.current = true
    }
  }, [data])

  function update(i: number, patch: Partial<RateCardRole>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  async function handleSave() {
    try {
      const payload = { roles: rows.map((r, i) => ({ ...r, sortOrder: i })) }
      await save.mutateAsync(payload)
      toast.success('Rate card saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save rate card')
    }
  }

  if (error) return <ErrorMessage message="Failed to load rate card" />
  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Default roles &amp; day rates. New opportunities inherit this rate card.
        </p>
        <Button onClick={handleSave} disabled={!isAdmin || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
      <AdminNotice />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-[1fr_7rem_6rem_6rem_2rem] items-center gap-2 pb-2 text-xs font-semibold text-muted-foreground">
            <span>Role</span>
            <span>Rate</span>
            <span>Unit</span>
            <span>Hours/day</span>
            <span />
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.id ?? `new-${i}`} className="grid grid-cols-[1fr_7rem_6rem_6rem_2rem] items-center gap-2">
                <Input value={r.roleName} disabled={!isAdmin} onChange={(e) => update(i, { roleName: e.target.value })} />
                <Input
                  type="number"
                  value={r.rate}
                  disabled={!isAdmin}
                  onChange={(e) => update(i, { rate: Number(e.target.value) })}
                />
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                  value={r.rateUnit}
                  disabled={!isAdmin}
                  onChange={(e) => update(i, { rateUnit: e.target.value as 'day' | 'hour' })}
                >
                  <option value="day">day</option>
                  <option value="hour">hour</option>
                </select>
                <Input
                  type="number"
                  value={r.hoursPerDay}
                  disabled={!isAdmin}
                  onChange={(e) => update(i, { hoursPerDay: Number(e.target.value) })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!isAdmin}
                  onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Remove role"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                setRows((prev) => [...prev, { roleName: '', rate: 1000, rateUnit: 'day', hoursPerDay: 8, sortOrder: prev.length }])
              }
            >
              <Plus className="h-4 w-4" /> Add role
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
