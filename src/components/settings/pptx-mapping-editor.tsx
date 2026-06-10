'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, CheckCircle2, AlertTriangle, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import {
  usePptxDeckTemplate,
  useUpdatePptxDeckTemplate,
  type ParsedSlideDTO,
} from '@/hooks/use-pptx-deck-templates'
import { getSections } from '@/lib/documents/proposal-sections'
import type { DeckKind, PptxMapping } from '@/lib/schemas/pptx-deck-template'

/** Sections the app can draw as native visual slides (spliced in, not token-filled). */
const VISUAL_SECTION_IDS = new Set(['solution_overview', 'plan'])

/** Count unbalanced {#x}/{/x} loop tokens on a slide (a likely authoring mistake). */
function unbalancedLoops(tokens: string[]): boolean {
  let open = 0
  for (const t of tokens) {
    if (t.startsWith('{#') || t.startsWith('{^')) open++
    else if (t.startsWith('{/')) open--
  }
  return open !== 0
}

export function PptxMappingEditor({ templateId }: { templateId: string }) {
  const isAdmin = useIsAdmin()
  const { data: template, isLoading, error } = usePptxDeckTemplate(templateId)
  const update = useUpdatePptxDeckTemplate()

  const [draft, setDraft] = useState<PptxMapping | null>(null)
  const [seeded, setSeeded] = useState(false)
  if (template && !seeded) {
    setSeeded(true)
    setDraft(template.mapping)
  }

  const slidesByIndex = useMemo(() => {
    const m = new Map<number, ParsedSlideDTO>()
    for (const s of template?.slides ?? []) m.set(s.index, s)
    return m
  }, [template])

  const sections = useMemo(() => (template ? getSections(template.deckKind as DeckKind) : []), [template])

  if (error) return <ErrorMessage message="Failed to load template" />
  if (isLoading || !template || !draft) return <Skeleton className="h-96 w-full" />

  const setSection = (sectionId: string, slideIndex: number | null) =>
    setDraft((d) => {
      if (!d) return d
      const sectionMap = { ...d.sectionMap }
      if (slideIndex === null) delete sectionMap[sectionId]
      else sectionMap[sectionId] = slideIndex
      return { ...d, sectionMap }
    })

  const toggleSplice = (sectionId: string, on: boolean) =>
    setDraft((d) => {
      if (!d) return d
      const visualSplice = on
        ? [...new Set([...d.visualSplice, sectionId])]
        : d.visualSplice.filter((s) => s !== sectionId)
      const sectionMap = { ...d.sectionMap }
      if (on) delete sectionMap[sectionId] // app-drawn → no template slide
      return { ...d, visualSplice, sectionMap }
    })

  const toggleGeneric = (slideIndex: number, on: boolean) =>
    setDraft((d) => {
      if (!d) return d
      const genericSlides = on
        ? [...d.genericSlides, { slideIndex, position: d.genericSlides.length }]
        : d.genericSlides.filter((g) => g.slideIndex !== slideIndex)
      return { ...d, genericSlides }
    })

  const setGenericPos = (slideIndex: number, position: number) =>
    setDraft((d) =>
      d ? { ...d, genericSlides: d.genericSlides.map((g) => (g.slideIndex === slideIndex ? { ...g, position } : g)) } : d
    )

  async function save(activate?: boolean) {
    if (!draft) return
    try {
      await update.mutateAsync({ id: templateId, mapping: draft, ...(activate !== undefined ? { isActive: activate } : {}) })
      toast.success(activate === true ? 'Saved & activated' : activate === false ? 'Deactivated' : 'Mapping saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    }
  }

  const genericIndexes = new Set(draft.genericSlides.map((g) => g.slideIndex))
  const slideLabel = (s: ParsedSlideDTO) => `Slide ${s.index} — ${s.title || '(untitled)'} · ${s.tokens.length} tokens`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/settings/templates/pptx" aria-label="Back" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-xs text-muted-foreground">
              <Badge variant="secondary" className="mr-2">
                {template.deckKind === 'board_summary' ? 'Board summary' : 'Full proposal'}
              </Badge>
              {template.isActive && <Badge className="mr-2"><CheckCircle2 className="mr-1 h-3 w-3" />Active</Badge>}
              {template.slides.length} slides
            </p>
          </div>
        </div>
      </div>

      <AdminNotice />

      <p className="text-sm text-muted-foreground">
        Map each section to a slide in this file. Tokens like{' '}
        <code className="rounded bg-muted px-1">{'{customerName}'}</code> and table-row loops{' '}
        <code className="rounded bg-muted px-1">{'{#raci}…{/raci}'}</code> are filled at generation. Sections marked{' '}
        <span className="font-medium">App visual</span> are drawn by the app (timeline / solution tower) and spliced in.
      </p>

      {/* Section -> slide mapping */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          {sections.map((section) => {
            const canSplice = VISUAL_SECTION_IDS.has(section.id)
            const spliced = draft.visualSplice.includes(section.id)
            const mappedIdx = draft.sectionMap[section.id]
            const mapped = mappedIdx ? slidesByIndex.get(mappedIdx) : undefined
            const warnUnbalanced = mapped && unbalancedLoops(mapped.tokens)
            return (
              <div key={section.id} className="grid grid-cols-1 gap-2 border-b border-border py-2 last:border-0 sm:grid-cols-[1fr_2fr] sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{section.title}</span>
                  {section.kind !== 'content' && <Badge variant="secondary" className="text-[10px]">{section.kind}</Badge>}
                  {canSplice && (
                    <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground sm:ml-2">
                      <Checkbox checked={spliced} onCheckedChange={(v) => toggleSplice(section.id, !!v)} disabled={!isAdmin} />
                      App visual
                    </label>
                  )}
                </div>
                {spliced ? (
                  <span className="text-xs italic text-muted-foreground">App-drawn visual slide (spliced in)</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                      value={mappedIdx ?? ''}
                      disabled={!isAdmin}
                      onChange={(e) => setSection(section.id, e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— skip / omit —</option>
                      {template.slides.map((s) => (
                        <option key={s.index} value={s.index}>{slideLabel(s)}</option>
                      ))}
                    </select>
                    {mapped?.hasTable && <Table2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="has table" />}
                    {warnUnbalanced && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="unbalanced loop tags" />}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Generic slides */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-sm font-medium">Generic slides (included as-is)</p>
          <p className="text-xs text-muted-foreground">Pick slides to insert verbatim, and the output position (lower = earlier).</p>
          {template.slides.map((s) => {
            const on = genericIndexes.has(s.index)
            const g = draft.genericSlides.find((x) => x.slideIndex === s.index)
            return (
              <div key={s.index} className="flex items-center gap-3 text-sm">
                <Checkbox checked={on} onCheckedChange={(v) => toggleGeneric(s.index, !!v)} disabled={!isAdmin} />
                <span className="flex-1 truncate">{slideLabel(s)}</span>
                {on && (
                  <input
                    type="number"
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                    value={g?.position ?? 0}
                    min={0}
                    disabled={!isAdmin}
                    onChange={(e) => setGenericPos(s.index, Number(e.target.value))}
                    aria-label="Output position"
                  />
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 py-3 backdrop-blur">
          {template.isActive ? (
            <Button variant="outline" onClick={() => save(false)} disabled={update.isPending}>Deactivate</Button>
          ) : (
            <Button variant="outline" onClick={() => save(true)} disabled={update.isPending}>
              <CheckCircle2 className="h-4 w-4" />Save & activate
            </Button>
          )}
          <Button onClick={() => save()} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save mapping
          </Button>
        </div>
      )}
    </div>
  )
}
