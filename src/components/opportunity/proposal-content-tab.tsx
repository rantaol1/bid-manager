'use client'

import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProposalDraft } from '@/hooks/use-proposal-draft'
import { useProposalData } from '@/hooks/use-proposal-data'
import { mergeDraftIntoData } from '@/lib/documents/merge-draft'
import { SectionEditor } from '@/components/deliverables/proposal-editors'
import { SectionPreview } from '@/components/preview/section-preview'
import { PreviewPanel } from '@/components/preview/preview-panel'
import type { EditorKey } from '@/lib/documents/proposal-sections'
import type { ProposalStructuredContent } from '@/types'

const GROUPS: Array<{ title: string; blocks: Array<{ key: EditorKey; title: string }> }> = [
  {
    title: 'Narrative',
    blocks: [
      { key: 'executiveSummary', title: 'Executive summary' },
      { key: 'understanding', title: 'Our understanding' },
      { key: 'valueDrivers', title: 'Business drivers → outcomes' },
      { key: 'commercialModel', title: 'Commercial model' },
      { key: 'recommendation', title: 'Recommendation (board summary)' },
      { key: 'teamReferences', title: 'Key people & references' },
      { key: 'contact', title: 'Contact details' },
    ],
  },
  {
    title: 'Approach & delivery',
    blocks: [
      { key: 'raci', title: 'RACI matrix' },
      { key: 'crims', title: 'CRIMs register' },
      { key: 'methodologyPhases', title: 'Methodology phases' },
      { key: 'waysOfWorking', title: 'Ways of working' },
      { key: 'governance', title: 'Project governance' },
      { key: 'customerCommitments', title: 'Customer commitments' },
      { key: 'dataMigrationSteps', title: 'Data migration steps' },
      { key: 'integrationSteps', title: 'Integration steps' },
      { key: 'testingSteps', title: 'Testing steps' },
      { key: 'adoptionSteps', title: 'Adoption steps' },
      { key: 'goLiveSteps', title: 'Go-live steps' },
      { key: 'whyArcwide', title: 'Why Arcwide' },
    ],
  },
]

export function ProposalContentTab({ opportunityId }: { opportunityId: string }) {
  const { content, update, flush, isSaving, defaults, isAdmin, onSaveDefault } = useProposalDraft(opportunityId)
  const { data: proposalData } = useProposalData(opportunityId)
  const previewData = proposalData ? mergeDraftIntoData(proposalData, content) : null

  function handleSaveDefault(key: keyof ProposalStructuredContent, value: unknown) {
    onSaveDefault(key, value)
      .then(() => toast.success('Saved as global default'))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not save default'))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          This content flows into generated proposals and board summaries. Edits auto-save; structured blocks fall back
          to the global defaults until you customise them.
        </p>
        <Button onClick={() => { flush(); toast.success('Saved') }} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
          {group.blocks.map((block) => (
            <Card key={block.key}>
              <CardHeader>
                <CardTitle className="text-base">{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SectionEditor
                    editorKey={block.key}
                    content={content}
                    update={update}
                    defaults={defaults}
                    isAdmin={isAdmin}
                    onSaveDefault={handleSaveDefault}
                  />
                  {previewData && (
                    <PreviewPanel>
                      <SectionPreview editorKey={block.key} data={previewData} />
                    </PreviewPanel>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
