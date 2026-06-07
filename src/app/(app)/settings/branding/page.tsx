'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import { useBranding, useSaveBranding } from '@/hooks/use-branding'
import type { BrandingInput } from '@/lib/schemas/settings'

export default function BrandingPage() {
  const { data, isLoading, error } = useBranding()
  const save = useSaveBranding()
  const isAdmin = useIsAdmin()
  const [form, setForm] = useState<BrandingInput | null>(null)
  const seededRef = useRef(false)

  useEffect(() => {
    if (!seededRef.current && data) {
      seededRef.current = true
      setForm({
        companyName: data.companyName,
        defaultCurrency: data.defaultCurrency,
        validityDays: data.validityDays,
        footerText: data.footerText,
        logoUrl: data.logoUrl,
      })
    }
  }, [data])

  async function handleSave() {
    if (!form) return
    try {
      await save.mutateAsync(form)
      toast.success('Branding saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save branding')
    }
  }

  if (error) return <ErrorMessage message="Failed to load branding settings" />
  if (isLoading || !form) return <Skeleton className="h-64 w-full" />

  const set = (patch: Partial<BrandingInput>) => setForm((p) => (p ? { ...p, ...patch } : p))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Company identity &amp; defaults applied to generated documents.</p>
        <Button onClick={handleSave} disabled={!isAdmin || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
      <AdminNotice />

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" className="mt-1" value={form.companyName ?? ''} disabled={!isAdmin} onChange={(e) => set({ companyName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="currency">Default currency</Label>
            <Input id="currency" className="mt-1" maxLength={3} value={form.defaultCurrency ?? ''} disabled={!isAdmin} onChange={(e) => set({ defaultCurrency: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label htmlFor="validity">Validity (days)</Label>
            <Input id="validity" type="number" className="mt-1" value={form.validityDays ?? 90} disabled={!isAdmin} onChange={(e) => set({ validityDays: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="footer">Document footer text</Label>
            <Input id="footer" className="mt-1" value={form.footerText ?? ''} disabled={!isAdmin} onChange={(e) => set({ footerText: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input id="logo" className="mt-1" value={form.logoUrl ?? ''} disabled={!isAdmin} onChange={(e) => set({ logoUrl: e.target.value || null })} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
