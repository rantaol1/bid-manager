'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, Pencil, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import { SectionPreview } from '@/components/preview/section-preview'
import { DeckSectionEditor } from '@/components/settings/deck-section-editor'
import {
  useDeckTemplate,
  useDeckTemplateVersion,
  useSaveDeckVersion,
  useUpdateDeckTemplate,
  type DeckVersionDTO,
} from '@/hooks/use-deck-templates'
import { getSections } from '@/lib/documents/proposal-sections'
import { buildTemplatePreviewData } from '@/lib/documents/blank-proposal-data'
import { normalizeRaci } from '@/lib/raci'
import { normalizeTeamStructure } from '@/lib/team-structure'
import type { DeckVersionContentInput } from '@/lib/schemas/deck-template'
import type { ProposalNarrative, ProposalStructuredContent } from '@/types'

const KIND_LABEL: Record<string, string> = { full_proposal: 'Full proposal', board_summary: 'Board summary' }

/** Pull the 12 structured blocks out of a version draft for preview. */
function deckContent(d: DeckVersionContentInput): ProposalStructuredContent {
  return {
    raci: normalizeRaci(d.raci),
    crims: d.crims,
    methodologyPhases: d.methodologyPhases,
    waysOfWorking: d.waysOfWorking,
    governance: d.governance,
    teamStructure: normalizeTeamStructure(d.teamStructure),
    customerCommitments: d.customerCommitments,
    dataMigrationSteps: d.dataMigrationSteps,
    integrationSteps: d.integrationSteps,
    testingSteps: d.testingSteps,
    adoptionSteps: d.adoptionSteps,
    goLiveSteps: d.goLiveSteps,
    whyArcwide: d.whyArcwide,
  }
}

function deckNarrative(d: DeckVersionContentInput): ProposalNarrative {
  return {
    executiveSummary: d.executiveSummary ?? null,
    understanding: d.understanding ?? null,
    valueDrivers: d.valueDrivers ?? [],
    commercialModel: d.commercialModel ?? null,
    recommendation: d.recommendation ?? null,
    teamProfiles: d.teamProfiles ?? [],
    references: d.references ?? [],
    contactName: d.contactName ?? null,
    contactTitle: d.contactTitle ?? null,
    contactEmail: d.contactEmail ?? null,
    contactPhone: d.contactPhone ?? null,
  }
}

/** Strip server-only fields, leaving the editable content layer. */
function toDraft(v: DeckVersionDTO): DeckVersionContentInput {
  const content = { ...v } as Record<string, unknown>
  delete content.id
  delete content.templateId
  delete content.version
  delete content.label
  delete content.createdAt
  return content as unknown as DeckVersionContentInput
}

export function DeckEditor({ templateId }: { templateId: string }) {
  const isAdmin = useIsAdmin()
  const { data: template, isLoading, error } = useDeckTemplate(templateId)

  // Base version to edit from: a user override, else the default (or latest).
  const [baseVersionOverride, setBaseVersionOverride] = useState<string | undefined>()
  const baseVersionId = baseVersionOverride ?? template?.defaultVersionId ?? template?.versions[0]?.id

  const { data: version } = useDeckTemplateVersion(templateId, baseVersionId)

  const [draft, setDraft] = useState<DeckVersionContentInput | null>(null)
  const [label, setLabel] = useState('')
  const [setAsDefault, setSetAsDefault] = useState(true)
  const [openEditor, setOpenEditor] = useState<string | null>(null)
  const [seededVersionId, setSeededVersionId] = useState<string | null>(null)

  // Seed the draft when the base version loads/changes (adjust-state-during-render).
  if (version && version.id !== seededVersionId) {
    setSeededVersionId(version.id)
    setDraft(toDraft(version))
    setOpenEditor(null)
  }

  const saveVersion = useSaveDeckVersion()
  const updateTemplate = useUpdateDeckTemplate()

  const update = (patch: Partial<DeckVersionContentInput>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))

  const sections = useMemo(() => (template ? getSections(template.kind) : []), [template])

  const previewData = useMemo(
    () =>
      draft
        ? buildTemplatePreviewData({
            content: deckContent(draft),
            narrative: deckNarrative(draft),
            companyName: draft.companyName,
            footerText: draft.footerText,
            sectionSelection: draft.sectionSelection,
          })
        : null,
    [draft]
  )

  async function handleSave() {
    if (!draft) return
    try {
      await saveVersion.mutateAsync({ templateId, content: draft, label: label.trim() || null, setAsDefault })
      toast.success('Saved as a new version')
      setLabel('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save version')
    }
  }

  async function handleWorkspaceDefault() {
    try {
      await updateTemplate.mutateAsync({ id: templateId, isWorkspaceDefault: true })
      toast.success('Set as the workspace default deck')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update')
    }
  }

  if (error) return <ErrorMessage message="Failed to load deck template" />
  if (isLoading || !template || !draft || !previewData) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/settings/templates/decks" aria-label="Back" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-xs text-muted-foreground">
              <Badge variant="secondary" className="mr-2">{KIND_LABEL[template.kind] ?? template.kind}</Badge>
              {template.isWorkspaceDefault && <Badge className="mr-2">Workspace default</Badge>}
              {template.versions.length} version{template.versions.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {isAdmin && !template.isWorkspaceDefault && (
          <Button variant="outline" size="sm" onClick={handleWorkspaceDefault} disabled={updateTemplate.isPending}>
            Make workspace default
          </Button>
        )}
      </div>

      <AdminNotice />

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Edit from version</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={baseVersionId}
              onChange={(e) => setBaseVersionOverride(e.target.value)}
            >
              {template.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version}
                  {v.id === template.defaultVersionId ? ' (default)' : ''}
                  {v.label ? ` · ${v.label}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Company name</Label>
            <Input
              className="mt-1"
              value={draft.companyName ?? ''}
              placeholder="Arcwide"
              onChange={(e) => update({ companyName: e.target.value || null })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Footer text</Label>
            <Input
              className="mt-1"
              value={draft.footerText ?? ''}
              placeholder="ARCWIDE · IFS CLOUD IMPLEMENTATION PROPOSAL"
              onChange={(e) => update({ footerText: e.target.value || null })}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Click an editable slide to change its content. Layout and branding stay fixed. Slides marked{' '}
        <Lock className="inline h-3 w-3" /> are generated from each opportunity’s data — here they show a placeholder.
        Toggle a slide off to drop it from this deck. Save your edits as a new version below.
      </p>

      <div className="space-y-4">
        {sections.map((section) => {
          const editable = !!section.editorKey
          const isContent = section.kind === 'content'
          const isCover = section.kind === 'cover'
          const on = isCover ? true : draft.sectionSelection[section.id] !== false
          const editing = openEditor === section.id
          return (
            <Card key={section.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={on}
                    disabled={isCover}
                    onCheckedChange={(v) =>
                      update({ sectionSelection: { ...draft.sectionSelection, [section.id]: !!v } })
                    }
                    aria-label={`Include ${section.title}`}
                  />
                  <span className="flex-1 font-medium">{section.title}</span>
                  {editable ? (
                    <Badge variant="default" className="text-[10px]">Editable</Badge>
                  ) : isContent ? (
                    <Badge variant="outline" className="text-[10px]"><Lock className="mr-1 h-3 w-3" />Data-driven</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                  )}
                  {editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setOpenEditor(editing ? null : section.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {editing ? 'Done' : 'Edit'}
                    </Button>
                  )}
                </div>

                {isContent && (
                  <div className={`grid gap-4 ${editing ? 'lg:grid-cols-2' : ''} ${on ? '' : 'opacity-50'}`}>
                    <button
                      type="button"
                      onClick={() => editable && setOpenEditor(editing ? null : section.id)}
                      className={`block w-full text-left ${editable ? 'cursor-pointer rounded-md ring-offset-2 transition hover:ring-2 hover:ring-magenta/50' : 'cursor-default'}`}
                      aria-label={editable ? `Edit ${section.title}` : undefined}
                    >
                      <SectionPreview editorKey={section.editorKey} sectionId={section.id} data={previewData} />
                    </button>
                    {editing && section.editorKey && (
                      <div className="rounded-md border border-border p-3">
                        <DeckSectionEditor editorKey={section.editorKey} draft={draft} update={update} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isAdmin && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 py-3 backdrop-blur">
          <Input
            className="h-9 w-56"
            placeholder="Version note (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={setAsDefault} onCheckedChange={(v) => setSetAsDefault(!!v)} />
            Make this the default version
          </label>
          <Button onClick={handleSave} disabled={saveVersion.isPending}>
            {saveVersion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save as new version
          </Button>
        </div>
      )}
    </div>
  )
}
