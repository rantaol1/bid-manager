'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  getSections,
  type DeliverableType,
  type ProposalSection,
} from '@/lib/documents/proposal-sections'
import type { ProposalContentInput } from '@/lib/schemas/proposal'
import { useProposalContent, useGenerateProposal, useSaveProposalContent } from '@/hooks/use-proposal'
import { useDeckTemplates, useDeckTemplateVersion } from '@/hooks/use-deck-templates'
import { usePptxDeckTemplates } from '@/hooks/use-pptx-deck-templates'

type Draft = Partial<ProposalContentInput>

function defaultSelection(type: DeliverableType): Record<string, boolean> {
  const next: Record<string, boolean> = {}
  for (const s of getSections(type)) next[s.id] = s.defaultOn
  return next
}

const fkField = (type: DeliverableType) =>
  type === 'board_summary' ? 'boardDeckVersionId' : 'fullDeckVersionId'

const MANUAL_KEYS = new Set(['executiveSummary', 'understanding', 'valueDrivers', 'commercialModel', 'recommendation', 'teamReferences', 'contact'])

function isEmptyManual(section: ProposalSection, content: Draft): boolean {
  switch (section.editorKey) {
    case 'executiveSummary': {
      const es = content.executiveSummary
      return !es || !Object.values(es).some((v) => v?.trim())
    }
    case 'understanding':
      return !content.understanding?.trim()
    case 'commercialModel':
      return !content.commercialModel?.trim()
    case 'recommendation':
      return !content.recommendation?.trim()
    case 'valueDrivers':
      return !(content.valueDrivers && content.valueDrivers.length > 0)
    case 'teamReferences':
      return !((content.teamProfiles?.length ?? 0) + (content.references?.length ?? 0))
    case 'contact':
      return !(content.contactName || content.contactEmail)
    default:
      return false
  }
}

function statusBadge(section: ProposalSection, content: Draft) {
  if (section.kind !== 'content') return { label: 'Auto', variant: 'secondary' as const }
  if (section.editorKey && MANUAL_KEYS.has(section.editorKey)) {
    return isEmptyManual(section, content)
      ? { label: 'Needs input', variant: 'outline' as const }
      : { label: 'Ready', variant: 'default' as const }
  }
  if (section.editorKey) return { label: 'Editable', variant: 'default' as const }
  return { label: 'Ready', variant: 'default' as const }
}

function BuilderBody({ opportunityId, onClose }: { opportunityId: string; onClose: () => void }) {
  const { data: serverContent } = useProposalContent(opportunityId)
  const content = (serverContent ?? {}) as Draft
  const generate = useGenerateProposal(opportunityId)
  const saveContent = useSaveProposalContent(opportunityId)
  const { data: allTemplates } = useDeckTemplates()

  const [type, setType] = useState<DeliverableType>('full_proposal')
  const sections = useMemo(() => getSections(type), [type])
  const [selectionByType, setSelectionByType] = useState<Record<DeliverableType, Record<string, boolean>>>(() => ({
    full_proposal: defaultSelection('full_proposal'),
    board_summary: defaultSelection('board_summary'),
  }))
  const selected = selectionByType[type]

  const templates = useMemo(() => (allTemplates ?? []).filter((t) => t.kind === type), [allTemplates, type])

  // PowerPoint (.potx) templates for this kind — chosen per generation ('' = built-in design).
  const { data: pptxTemplates } = usePptxDeckTemplates()
  const pptxForType = useMemo(() => (pptxTemplates ?? []).filter((t) => t.deckKind === type), [pptxTemplates, type])
  const [pptxByType, setPptxByType] = useState<Record<DeliverableType, string>>({ full_proposal: '', board_summary: '' })
  const [pptxInitialised, setPptxInitialised] = useState(false)
  if (pptxTemplates && !pptxInitialised) {
    const next: Record<DeliverableType, string> = { full_proposal: '', board_summary: '' }
    for (const tp of ['full_proposal', 'board_summary'] as DeliverableType[]) {
      const active = pptxTemplates.find((t) => t.deckKind === tp && t.isActive)
      if (active) next[tp] = active.id
    }
    setPptxInitialised(true)
    setPptxByType(next)
  }
  const selectedPptxId = pptxByType[type]
  const usingPptx = !!selectedPptxId

  // versionId -> templateId (and -> kind) lookup across all templates.
  const versionOwner = useMemo(() => {
    const m = new Map<string, { templateId: string; kind: DeliverableType }>()
    for (const t of allTemplates ?? []) for (const v of t.versions) m.set(v.id, { templateId: t.id, kind: t.kind })
    return m
  }, [allTemplates])

  // Selected deck version per kind — from the saved per-opportunity choice, else
  // the workspace-default deck's default version. Initialised once both queries load.
  const [versionIdByType, setVersionIdByType] = useState<Partial<Record<DeliverableType, string>>>({})
  const [versionsInitialised, setVersionsInitialised] = useState(false)
  if (allTemplates && serverContent && !versionsInitialised) {
    const next: Partial<Record<DeliverableType, string>> = {}
    for (const tp of ['full_proposal', 'board_summary'] as DeliverableType[]) {
      const fk = (serverContent as Record<string, unknown>)[fkField(tp)] as string | undefined
      if (fk && versionOwner.has(fk)) {
        next[tp] = fk
        continue
      }
      const wd = allTemplates.find((t) => t.kind === tp && t.isWorkspaceDefault) ?? allTemplates.find((t) => t.kind === tp)
      const v = wd?.defaultVersionId ?? wd?.versions[0]?.id
      if (v) next[tp] = v
    }
    setVersionsInitialised(true)
    setVersionIdByType(next)
  }

  const selectedVersionId = versionIdByType[type]
  const selectedTemplateId = selectedVersionId ? versionOwner.get(selectedVersionId)?.templateId : undefined
  const { data: versionData } = useDeckTemplateVersion(selectedTemplateId, selectedVersionId)

  // Seed the checklist from the chosen version's section selection (adjust during render).
  const [seededSelectionFor, setSeededSelectionFor] = useState<string | null>(null)
  if (versionData?.sectionSelection && versionData.id !== seededSelectionFor) {
    const kind = versionOwner.get(versionData.id)?.kind
    if (kind) {
      setSeededSelectionFor(versionData.id)
      setSelectionByType((prev) => ({ ...prev, [kind]: { ...(versionData.sectionSelection as Record<string, boolean>) } }))
    }
  }

  function pickVersion(versionId: string) {
    setVersionIdByType((prev) => ({ ...prev, [type]: versionId }))
    saveContent.mutate({ [fkField(type)]: versionId } as ProposalContentInput)
  }

  function pickTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId)
    const v = t?.defaultVersionId ?? t?.versions[0]?.id
    if (v) pickVersion(v)
  }

  function toggle(id: string, value: boolean) {
    setSelectionByType((prev) => ({ ...prev, [type]: { ...prev[type], [id]: value } }))
  }

  const total = sections.length
  const selectedCount = sections.filter((s) => s.kind === 'cover' || selected[s.id]).length

  async function handleGenerate() {
    const ids = sections.filter((s) => selected[s.id]).map((s) => s.id)
    try {
      await generate.mutateAsync({
        type,
        // When generating from a .potx, the template mapping drives sections;
        // send all section ids so the omitted-selection fallback never trips.
        selectedSections: usingPptx ? sections.map((s) => s.id) : ids,
        pptxTemplateId: selectedPptxId || null,
      })
      toast.success(type === 'board_summary' ? 'Board Summary generated' : 'Full Proposal generated')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    }
  }

  // Group sections by chapter for the checklist.
  const groups = useMemo(() => {
    const map = new Map<string, ProposalSection[]>()
    for (const s of sections) {
      const list = map.get(s.chapter) ?? []
      list.push(s)
      map.set(s.chapter, list)
    }
    return [...map.entries()]
  }, [sections])

  return (
    <div className="flex h-[72vh] flex-col">
      {/* type toggle */}
      <div className="flex gap-2 border-b pb-3">
        {(['full_proposal', 'board_summary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm',
              type === t ? 'border-magenta bg-magenta/10 text-magenta font-medium' : 'border-border text-muted-foreground'
            )}
          >
            {t === 'full_proposal'
              ? `Full Proposal (${getSections('full_proposal').length} slides)`
              : `Board Summary (${getSections('board_summary').length} slides)`}
          </button>
        ))}
      </div>

      {/* output design: built-in vs an uploaded PowerPoint (.potx) template */}
      {pptxForType.length > 0 && (
        <div className="mt-3 rounded-md border border-border p-3">
          <Label className="text-xs">Output design</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={selectedPptxId}
            onChange={(e) => setPptxByType((prev) => ({ ...prev, [type]: e.target.value }))}
          >
            <option value="">Built-in Arcwide design</option>
            {pptxForType.map((t) => (
              <option key={t.id} value={t.id}>
                PowerPoint template: {t.name}
                {t.isActive ? ' (active)' : ''}
              </option>
            ))}
          </select>
          {usingPptx && (
            <p className="mt-2 text-xs text-muted-foreground">
              The deck is built from this PowerPoint template’s slide mapping (manage in{' '}
              <span className="font-medium">Settings → PowerPoint templates</span>). The section checklist below applies
              to the built-in design only; token content still comes from the deck template/version.
            </p>
          )}
        </div>
      )}

      {/* deck template + version picker */}
      {templates.length > 0 && (
        <div className="mt-3 grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Deck template</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={selectedTemplateId ?? ''}
              onChange={(e) => pickTemplate(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isWorkspaceDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Version</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={selectedVersionId ?? ''}
              onChange={(e) => pickVersion(e.target.value)}
              disabled={!selectedTemplateId}
            >
              {(templates.find((t) => t.id === selectedTemplateId)?.versions ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version}
                  {v.label ? ` · ${v.label}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <p className="pt-3 text-xs text-muted-foreground">
        Pick a deck template version and the sections to include, then generate. Edit deck templates in
        <span className="font-medium"> Settings → Slide decks</span>; edit per-opportunity content in the
        <span className="font-medium"> Proposal</span> tab.
      </p>

      {/* section checklist */}
      <div className={cn('mt-2 flex-1 space-y-4 overflow-y-auto pr-1', usingPptx && 'pointer-events-none opacity-40')}>
        {groups.map(([chapter, items]) => (
          <div key={chapter}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{chapter}</p>
            <div className="space-y-1">
              {items.map((s) => {
                const badge = statusBadge(s, content)
                const isCover = s.kind === 'cover'
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={isCover ? true : !!selected[s.id]}
                      disabled={isCover}
                      onCheckedChange={(v) => toggle(s.id, !!v)}
                    />
                    <span className="flex-1 truncate">{s.title}</span>
                    <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">
          {usingPptx ? 'Generated from the selected PowerPoint template' : `Selected: ${selectedCount} of ${total} slides`}
        </span>
        <Button onClick={handleGenerate} disabled={generate.isPending}>
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Generate PPTX
        </Button>
      </div>
    </div>
  )
}

export function ProposalBuilder({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4" />
        Build Proposal
      </Button>
      <DialogContent className="w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate proposal</DialogTitle>
        </DialogHeader>
        {open && <BuilderBody opportunityId={opportunityId} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}
