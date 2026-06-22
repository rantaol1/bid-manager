'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import { useProposalDefaults, useSaveProposalDefaults } from '@/hooks/use-proposal'
import {
  RaciEditor,
  CrimsEditor,
  MethodologyEditor,
  TitledItemsEditor,
  StringListEditor,
  GovernanceEditor,
} from '@/components/deliverables/proposal-editors'
import { normalizeRaci } from '@/lib/raci'
import { normalizeGovernance } from '@/lib/governance'
import type { ProposalStructuredContent } from '@/types'

export default function ProposalDefaultsPage() {
  const { data, isLoading, error } = useProposalDefaults()
  const save = useSaveProposalDefaults()
  const isAdmin = useIsAdmin()
  const [draft, setDraft] = useState<ProposalStructuredContent | null>(null)
  const seededRef = useRef(false)

  useEffect(() => {
    if (!seededRef.current && data) {
      seededRef.current = true
      setDraft({ ...data, raci: normalizeRaci(data.raci), governance: normalizeGovernance(data.governance) })
    }
  }, [data])

  function set<K extends keyof ProposalStructuredContent>(key: K, value: ProposalStructuredContent[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!draft) return
    try {
      await save.mutateAsync(draft)
      toast.success('Defaults saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save defaults')
    }
  }

  if (error) return <ErrorMessage message="Failed to load proposal defaults" />
  if (isLoading || !draft) return <Skeleton className="h-64 w-full" />

  const fieldset = !isAdmin ? 'pointer-events-none opacity-60' : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Global default content used by every proposal until an opportunity overrides it.
        </p>
        <Button onClick={handleSave} disabled={!isAdmin || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
      <AdminNotice />

      <div className={`space-y-4 ${fieldset}`}>
        <Card>
          <CardHeader><CardTitle className="text-base">RACI matrix</CardTitle></CardHeader>
          <CardContent><RaciEditor value={draft.raci} onChange={(v) => set('raci', v)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">CRIMs register</CardTitle></CardHeader>
          <CardContent><CrimsEditor value={draft.crims} onChange={(v) => set('crims', v)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Methodology phases</CardTitle></CardHeader>
          <CardContent><MethodologyEditor value={draft.methodologyPhases} onChange={(v) => set('methodologyPhases', v)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Ways of working</CardTitle></CardHeader>
          <CardContent><TitledItemsEditor value={draft.waysOfWorking} onChange={(v) => set('waysOfWorking', v)} max={8} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Project governance</CardTitle></CardHeader>
          <CardContent><GovernanceEditor value={draft.governance} onChange={(v) => set('governance', v)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Customer commitments</CardTitle></CardHeader>
          <CardContent><TitledItemsEditor value={draft.customerCommitments} onChange={(v) => set('customerCommitments', v)} max={8} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Why Arcwide</CardTitle></CardHeader>
          <CardContent><TitledItemsEditor value={draft.whyArcwide} onChange={(v) => set('whyArcwide', v)} max={6} /></CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          {([
            ['dataMigrationSteps', 'Data migration steps'],
            ['integrationSteps', 'Integration steps'],
            ['testingSteps', 'Testing steps'],
            ['adoptionSteps', 'Adoption steps'],
            ['goLiveSteps', 'Go-live steps'],
          ] as const).map(([key, title]) => (
            <Card key={key}>
              <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent><StringListEditor value={draft[key]} onChange={(v) => set(key, v)} max={8} /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
