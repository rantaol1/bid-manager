'use client'

import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  ExecutiveSummaryEditor,
  ValueDriversEditor,
  TeamReferencesEditor,
  ContactEditor,
  StandardTextPicker,
  appendText,
  RaciEditor,
  CrimsEditor,
  MethodologyEditor,
  TitledItemsEditor,
  StringListEditor,
  GovernanceEditor,
  TeamStructureEditor,
} from '@/components/deliverables/proposal-editors'
import { normalizeRaci } from '@/lib/raci'
import { normalizeGovernance } from '@/lib/governance'
import { normalizeTeamStructure } from '@/lib/team-structure'
import type { EditorKey } from '@/lib/documents/proposal-sections'
import type { DeckVersionContentInput } from '@/lib/schemas/deck-template'
import type { ProposalContentInput } from '@/lib/schemas/proposal'
import type { ProposalStructuredContent } from '@/types'

type Draft = DeckVersionContentInput
type Update = (patch: Partial<Draft>) => void

const STRUCTURED_KEYS: Partial<Record<EditorKey, keyof ProposalStructuredContent>> = {
  raci: 'raci',
  crims: 'crims',
  methodologyPhases: 'methodologyPhases',
  waysOfWorking: 'waysOfWorking',
  governance: 'governance',
  teamStructure: 'teamStructure',
  customerCommitments: 'customerCommitments',
  dataMigrationSteps: 'dataMigrationSteps',
  integrationSteps: 'integrationSteps',
  testingSteps: 'testingSteps',
  adoptionSteps: 'adoptionSteps',
  goLiveSteps: 'goLiveSteps',
  whyArcwide: 'whyArcwide',
}

/**
 * Edits one section's content for a deck template version. Reuses the proposal-tab
 * editors, but writes directly into the version draft (no opportunity-override /
 * "reset to default" semantics — the version IS the content).
 */
export function DeckSectionEditor({
  editorKey,
  draft,
  update,
}: {
  editorKey: EditorKey
  draft: Draft
  update: Update
}) {
  // Narrative editors accept the per-opportunity content shape; the deck draft's
  // narrative fields are compatible, so we cast for reuse.
  const narrativeContent = draft as unknown as Partial<ProposalContentInput>
  const narrativeUpdate = update as unknown as (patch: Partial<ProposalContentInput>) => void

  if (editorKey === 'executiveSummary')
    return <ExecutiveSummaryEditor content={narrativeContent} update={narrativeUpdate} />
  if (editorKey === 'valueDrivers')
    return <ValueDriversEditor content={narrativeContent} update={narrativeUpdate} />
  if (editorKey === 'teamReferences')
    return <TeamReferencesEditor content={narrativeContent} update={narrativeUpdate} />
  if (editorKey === 'contact') return <ContactEditor content={narrativeContent} update={narrativeUpdate} />

  if (editorKey === 'understanding')
    return (
      <div className="space-y-2">
        <StandardTextPicker onInsert={(t) => update({ understanding: appendText(draft.understanding, t) })} />
        <RichTextEditor
          placeholder="Narrative about the customer’s business…"
          value={draft.understanding ?? ''}
          onChange={(html) => update({ understanding: html })}
        />
      </div>
    )
  if (editorKey === 'commercialModel')
    return (
      <div className="space-y-2">
        <StandardTextPicker onInsert={(t) => update({ commercialModel: appendText(draft.commercialModel, t) })} />
        <RichTextEditor
          placeholder="Describe the commercial model…"
          value={draft.commercialModel ?? ''}
          onChange={(html) => update({ commercialModel: html })}
        />
      </div>
    )
  if (editorKey === 'recommendation')
    return (
      <div className="space-y-2">
        <StandardTextPicker onInsert={(t) => update({ recommendation: appendText(draft.recommendation, t) })} />
        <RichTextEditor
          placeholder="Recommendation statement…"
          value={draft.recommendation ?? ''}
          onChange={(html) => update({ recommendation: html })}
        />
      </div>
    )

  const structKey = STRUCTURED_KEYS[editorKey]
  if (!structKey) {
    return <p className="text-sm text-muted-foreground">This slide is generated from opportunity data.</p>
  }

  const set = (v: unknown) => update({ [structKey]: v } as Partial<Draft>)
  switch (structKey) {
    case 'raci':
      return <RaciEditor value={normalizeRaci(draft.raci)} onChange={set} />
    case 'crims':
      return <CrimsEditor value={draft.crims} onChange={set} />
    case 'methodologyPhases':
      return <MethodologyEditor value={draft.methodologyPhases} onChange={set} />
    case 'waysOfWorking':
      return <TitledItemsEditor value={draft.waysOfWorking} onChange={set} max={8} />
    case 'customerCommitments':
      return <TitledItemsEditor value={draft.customerCommitments} onChange={set} max={8} />
    case 'whyArcwide':
      return <TitledItemsEditor value={draft.whyArcwide} onChange={set} max={6} />
    case 'governance':
      return <GovernanceEditor value={normalizeGovernance(draft.governance)} onChange={set} />
    case 'teamStructure':
      return <TeamStructureEditor value={normalizeTeamStructure(draft.teamStructure)} onChange={set} />
    case 'dataMigrationSteps':
      return <StringListEditor value={draft.dataMigrationSteps} onChange={set} max={8} />
    case 'integrationSteps':
      return <StringListEditor value={draft.integrationSteps} onChange={set} max={8} />
    case 'testingSteps':
      return <StringListEditor value={draft.testingSteps} onChange={set} max={8} />
    case 'adoptionSteps':
      return <StringListEditor value={draft.adoptionSteps} onChange={set} max={8} />
    case 'goLiveSteps':
      return <StringListEditor value={draft.goLiveSteps} onChange={set} max={8} />
    default:
      return null
  }
}
