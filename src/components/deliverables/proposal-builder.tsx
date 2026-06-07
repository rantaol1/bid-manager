'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useProposalContent, useGenerateProposal } from '@/hooks/use-proposal'

type Draft = Partial<ProposalContentInput>

function defaultSelection(type: DeliverableType): Record<string, boolean> {
  const next: Record<string, boolean> = {}
  for (const s of getSections(type)) next[s.id] = s.defaultOn
  return next
}

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

  const [type, setType] = useState<DeliverableType>('full_proposal')
  const sections = useMemo(() => getSections(type), [type])
  const [selectionByType, setSelectionByType] = useState<Record<DeliverableType, Record<string, boolean>>>(() => ({
    full_proposal: defaultSelection('full_proposal'),
    board_summary: defaultSelection('board_summary'),
  }))
  const selected = selectionByType[type]

  function toggle(id: string, value: boolean) {
    setSelectionByType((prev) => ({ ...prev, [type]: { ...prev[type], [id]: value } }))
  }

  const total = sections.length
  const selectedCount = sections.filter((s) => s.kind === 'cover' || selected[s.id]).length

  async function handleGenerate() {
    const ids = sections.filter((s) => selected[s.id]).map((s) => s.id)
    try {
      await generate.mutateAsync({ type, selectedSections: ids })
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

      <p className="pt-3 text-xs text-muted-foreground">
        Pick the sections to include, then generate. Edit slide content (RACI, CRIMs, narrative, methodology…) in the
        <span className="font-medium"> Proposal</span> tab.
      </p>

      {/* section checklist */}
      <div className="mt-2 flex-1 space-y-4 overflow-y-auto pr-1">
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
        <span className="text-sm text-muted-foreground">Selected: {selectedCount} of {total} slides</span>
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
