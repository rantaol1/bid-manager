'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
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
import type { ProposalStructuredContent } from '@/types'
import type { ProposalContentInput } from '@/lib/schemas/proposal'
import {
  useProposalContent,
  useSaveProposalContent,
  useProposalDefaults,
  useSaveProposalDefaults,
  useGenerateProposal,
} from '@/hooks/use-proposal'
import { SectionEditor } from './proposal-editors'

type Draft = Partial<ProposalContentInput>

function defaultSelection(type: DeliverableType): Record<string, boolean> {
  const next: Record<string, boolean> = {}
  for (const s of getSections(type)) next[s.id] = s.defaultOn
  return next
}

function firstFocus(type: DeliverableType): string {
  return getSections(type).find((s) => s.kind === 'content')?.id ?? ''
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
  const { data: defaults } = useProposalDefaults()
  const saveContent = useSaveProposalContent(opportunityId)
  const saveDefaults = useSaveProposalDefaults()
  const generate = useGenerateProposal(opportunityId)
  const { user } = useUser()
  const isAdmin = (user?.publicMetadata?.role as string) === 'admin'

  const [type, setType] = useState<DeliverableType>('full_proposal')
  const sections = useMemo(() => getSections(type), [type])

  const [selected, setSelected] = useState<Record<string, boolean>>(() => defaultSelection('full_proposal'))
  const [focusedId, setFocusedId] = useState<string>(() => firstFocus('full_proposal'))
  const [content, setContent] = useState<Draft>({})
  const seededRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Seed the draft once from the server row (sync from external state).
  useEffect(() => {
    if (!seededRef.current && serverContent) {
      setContent(serverContent as Draft)
      seededRef.current = true
    }
  }, [serverContent])

  // Reset section selection + focus when the deliverable type changes.
  function changeType(t: DeliverableType) {
    setType(t)
    setSelected(defaultSelection(t))
    setFocusedId(firstFocus(t))
  }

  function flushSave(draft: Draft) {
    saveContent.mutate(draft)
  }

  function update(patch: Draft) {
    setContent((prev) => {
      const next = { ...prev, ...patch }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => flushSave(next), 800)
      return next
    })
  }

  function onSaveDefault(key: keyof ProposalStructuredContent, value: unknown) {
    if (!defaults) return
    saveDefaults.mutate(
      { ...defaults, [key]: value },
      {
        onSuccess: () => toast.success('Saved as global default'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save default'),
      }
    )
  }

  const total = sections.length
  const selectedCount = sections.filter((s) => s.kind === 'cover' || selected[s.id]).length

  async function handleGenerate() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (seededRef.current) await saveContent.mutateAsync(content).catch(() => {})
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

  const focused = sections.find((s) => s.id === focusedId)

  return (
    <div className="flex h-[78vh] flex-col">
      {/* type toggle */}
      <div className="flex gap-2 border-b pb-3">
        {(['full_proposal', 'board_summary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => changeType(t)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm',
              type === t ? 'border-magenta bg-magenta/10 text-magenta font-medium' : 'border-border text-muted-foreground'
            )}
          >
            {t === 'full_proposal' ? `Full Proposal (${getSections('full_proposal').length} slides)` : `Board Summary (${getSections('board_summary').length} slides)`}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-4 pt-3">
        {/* left: section checklist */}
        <div className="flex-1 min-w-0 space-y-4 overflow-y-auto pr-2">
          {groups.map(([chapter, items]) => (
            <div key={chapter}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{chapter}</p>
              <div className="space-y-1">
                {items.map((s) => {
                  const badge = statusBadge(s, content)
                  const isCover = s.kind === 'cover'
                  return (
                    <div
                      key={s.id}
                      onClick={() => s.editorKey && setFocusedId(s.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                        s.editorKey && 'cursor-pointer hover:bg-muted',
                        focusedId === s.id && 'bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={isCover ? true : !!selected[s.id]}
                        disabled={isCover}
                        onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [s.id]: !!v }))}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="flex-1 truncate">{s.title}</span>
                      <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* right: editor for focused section */}
        <div className="flex-1 min-w-0 overflow-y-auto border-l pl-4">
          {focused?.editorKey ? (
            <>
              <p className="mb-3 text-sm font-semibold">{focused.title}</p>
              <SectionEditor
                editorKey={focused.editorKey}
                content={content}
                update={update}
                defaults={defaults}
                isAdmin={isAdmin}
                onSaveDefault={onSaveDefault}
              />
            </>
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">
              Select a section with editable content on the left to populate its text and tables. Other slides are generated automatically from your opportunity data.
            </p>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Selected: {selectedCount} of {total} slides</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (saveTimer.current) clearTimeout(saveTimer.current)
              flushSave(content)
              toast.success('Draft saved')
            }}
          >
            Save draft
          </Button>
          <Button onClick={handleGenerate} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate PPTX
          </Button>
        </div>
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
      <DialogContent className="w-[95vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Generate proposal</DialogTitle>
        </DialogHeader>
        {open && <BuilderBody opportunityId={opportunityId} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}
