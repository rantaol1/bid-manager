'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateCustomer, useUpdateCustomer, type CustomerDTO } from '@/hooks/use-customers'

interface CustomerFormDialogProps {
  trigger: React.ReactElement
  customer?: CustomerDTO
}

const FIELDS = [
  { key: 'name', label: 'Customer name', required: true },
  { key: 'industry', label: 'Industry' },
  { key: 'country', label: 'Country' },
  { key: 'contactName', label: 'Contact name' },
  { key: 'contactEmail', label: 'Contact email', type: 'email' },
  { key: 'contactPhone', label: 'Contact phone' },
] as const

export function CustomerFormDialog({ trigger, customer }: CustomerFormDialogProps) {
  const isEdit = Boolean(customer)
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    industry: customer?.industry ?? '',
    country: customer?.country ?? '',
    contactName: customer?.contactName ?? '',
    contactEmail: customer?.contactEmail ?? '',
    contactPhone: customer?.contactPhone ?? '',
    notes: customer?.notes ?? '',
  })

  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer(customer?.id ?? '')
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    if (!form.name.trim()) {
      setErrors({ name: 'Customer name is required' })
      return
    }
    if (form.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail)) {
      setErrors({ contactEmail: 'Enter a valid email address' })
      return
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form)
        toast.success('Customer updated')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Customer created')
      }
      setOpen(false)
      if (!isEdit) {
        setForm({ name: '', industry: '', country: '', contactName: '', contactEmail: '', contactPhone: '', notes: '' })
      }
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Something went wrong' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'New customer'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the customer details.' : 'Add a new prospect or customer.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className={field.key === 'name' ? 'sm:col-span-2' : ''}>
                <Label htmlFor={field.key}>
                  {field.label}
                  {'required' in field && field.required && <span className="text-magenta"> *</span>}
                </Label>
                <Input
                  id={field.key}
                  type={'type' in field ? field.type : 'text'}
                  value={form[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="mt-1"
                />
                {errors[field.key] && (
                  <p className="mt-1 text-sm text-destructive">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
