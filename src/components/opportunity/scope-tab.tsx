'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/common/error-message'
import { StringListEditor } from '@/components/common/string-list-editor'
import { ModulePicker } from '@/components/scope/module-picker'
import { FitGapSummary } from '@/components/scope/fit-gap-summary'
import { RequirementsTable } from '@/components/scope/requirements-table'
import { RiskRegister } from '@/components/scope/risk-register'
import { useScope, useSaveScope, type ScopeData } from '@/hooks/use-scope'

const EMPTY: ScopeData = { modules: {}, requirements: [], assumptions: [], exclusions: [], risks: [] }

export function ScopeTab({ opportunityId }: { opportunityId: string }) {
  const { data, isLoading, error } = useScope(opportunityId)
  const saveScope = useSaveScope(opportunityId)
  // Initialise / reset the editable draft when scope data loads (render-phase reset).
  const [prevData, setPrevData] = useState(data)
  const [draft, setDraft] = useState<ScopeData>(data ? { ...EMPTY, ...data } : EMPTY)
  if (data !== prevData) {
    setPrevData(data)
    if (data) setDraft({ ...EMPTY, ...data })
  }

  async function handleSave() {
    try {
      await saveScope.mutateAsync(draft)
      toast.success('Scope saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save scope')
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (error) return <ErrorMessage message="Failed to load scope" />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveScope.isPending}>
          <Save className="h-4 w-4" />
          {saveScope.isPending ? 'Saving…' : 'Save scope'}
        </Button>
      </div>

      <FitGapSummary modules={draft.modules} requirements={draft.requirements} />

      <Card>
        <CardHeader>
          <CardTitle>IFS modules in scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ModulePicker modules={draft.modules} onChange={(modules) => setDraft((d) => ({ ...d, modules }))} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <RequirementsTable
            requirements={draft.requirements}
            onChange={(requirements) => setDraft((d) => ({ ...d, requirements }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
          </CardHeader>
          <CardContent>
            <StringListEditor
              items={draft.assumptions}
              onChange={(assumptions) => setDraft((d) => ({ ...d, assumptions }))}
              placeholder="Add an assumption…"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <StringListEditor
              items={draft.exclusions}
              onChange={(exclusions) => setDraft((d) => ({ ...d, exclusions }))}
              placeholder="Add an exclusion…"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RiskRegister risks={draft.risks} onChange={(risks) => setDraft((d) => ({ ...d, risks }))} />
        </CardContent>
      </Card>
    </div>
  )
}
