'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { STAGES } from '@/lib/constants/stages'
import { useCreateOpportunity } from '@/hooks/use-opportunities'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'SEK']

export function OpportunityForm({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter()
  const createMutation = useCreateOpportunity()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    name: '',
    customerId: '',
    stage: 'lead',
    expectedValue: '',
    currency: 'EUR',
    probability: '',
    closeDate: '',
    tags: '',
    notes: '',
  })

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.customerId) next.customerId = 'Select a customer'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    try {
      const created = await createMutation.mutateAsync({
        name: form.name.trim(),
        customerId: form.customerId,
        stage: form.stage as never,
        currency: form.currency,
        expectedValue: form.expectedValue ? Number(form.expectedValue) : null,
        probability: form.probability ? Number(form.probability) : null,
        closeDate: form.closeDate || null,
        tags: form.tags
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        notes: form.notes,
      })
      toast.success('Opportunity created')
      router.push(`/opportunities/${created.id}`)
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Failed to create opportunity' })
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div>
            <Label htmlFor="customer">
              Customer <span className="text-magenta">*</span>
            </Label>
            <Select value={form.customerId} onValueChange={(v) => update('customerId', v as string)}>
              <SelectTrigger id="customer" className="mt-1 w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId && <p className="mt-1 text-sm text-destructive">{errors.customerId}</p>}
          </div>

          <div>
            <Label htmlFor="name">
              Opportunity name <span className="text-magenta">*</span>
            </Label>
            <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-1" />
            {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => update('stage', v as string)}>
                <SelectTrigger id="stage" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) => update('probability', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="expectedValue">Expected value</Label>
              <Input
                id="expectedValue"
                type="number"
                min={0}
                value={form.expectedValue}
                onChange={(e) => update('expectedValue', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => update('currency', v as string)}>
                <SelectTrigger id="currency" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="closeDate">Expected close date</Label>
              <Input
                id="closeDate"
                type="date"
                value={form.closeDate}
                onChange={(e) => update('closeDate', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" value={form.tags} onChange={(e) => update('tags', e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} className="mt-1" rows={3} />
          </div>

          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create opportunity'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
