'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Upload, Loader2, Trash2, Presentation, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { EmptyState } from '@/components/common/empty-state'
import { FileUploadZone } from '@/components/deliverables/file-upload-zone'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import {
  usePptxDeckTemplates,
  useUploadPptxDeckTemplate,
  useDeletePptxDeckTemplate,
} from '@/hooks/use-pptx-deck-templates'
import type { DeckKind } from '@/lib/schemas/pptx-deck-template'
import { PLACEHOLDER_REFERENCE } from '@/lib/templates/placeholder-schema'

const KIND_LABEL: Record<string, string> = { full_proposal: 'Full proposal', board_summary: 'Board summary' }

/** Recommended tokens per proposal section (for the mapping cheat-sheet). */
const SECTION_TOKENS: Array<{ section: string; tokens: string }> = [
  { section: 'Cover', tokens: '{customerName} · {opportunityName} · {date} · {companyName}' },
  { section: 'Executive summary', tokens: '{executiveSummary} (or {esOpportunity}, {esWhatWePropose}, {esHowWeDeliver}, {esInvestment}, {esWhyArcwide})' },
  { section: 'Our understanding', tokens: '{understanding}' },
  { section: 'Business drivers → outcomes', tokens: '{#valueDrivers}{driver}{ifsCapability}{targetOutcome}{/valueDrivers} — table' },
  { section: 'In scope — by module', tokens: '{#scopeIn}{name}{description}{fit}{/scopeIn} — table' },
  { section: 'Out of scope & deferred', tokens: '{#exclusions}{text}{/exclusions} · {#deferred}{text}{/deferred}' },
  { section: 'Assumptions', tokens: '{#assumptions}{text}{/assumptions}' },
  { section: 'Fit assessment', tokens: '{#fitAssessment}{title}{module}{priority}{fit}{/fitAssessment} — table' },
  { section: 'Methodology', tokens: '{#methodologyPhases}{phase}{focus}{deliverables}{/methodologyPhases} — table' },
  { section: 'Ways of working', tokens: '{#waysOfWorking}{title}{description}{/waysOfWorking}' },
  { section: 'Project plan (phasing)', tokens: '{#phases}{phaseName}{rolloutName}{workingDays}{totalDays}{totalCost}{/phases} — table' },
  { section: 'Governance', tokens: '{governanceSteering} · {governancePmo} · {#governanceWorkstreams}{name}{/governanceWorkstreams}' },
  { section: 'Delivery team', tokens: '{#team}{roleName}{totalDays}{totalCost}{fte}{/team} — table' },
  { section: 'RACI', tokens: '{#raci}{activity}{cells}{/raci} — table (cells = combined assignments)' },
  { section: 'CRIMs', tokens: '{#crims}{type}{name}{description}{complexity}{/crims} — table' },
  { section: 'What we need from you', tokens: '{#customerCommitments}{title}{description}{/customerCommitments}' },
  { section: 'Data migration / Integration / Testing / Adoption / Go-live', tokens: 'matching {#dataMigrationSteps}{step}{/…} loop per section' },
  { section: 'Risk management', tokens: '{#risks}{title}{impact}{mitigation}{/risks} — table' },
  { section: 'Commercials', tokens: '{totalCost} · {durationMonths} · {teamSize} · {commercialModel}' },
  { section: 'Why Arcwide', tokens: '{#whyArcwide}{title}{description}{/whyArcwide}' },
  { section: 'Key people & references', tokens: '{#teamProfiles}{name}{role}{/teamProfiles} · {#references}{name}{scope}{outcome}{/references}' },
  { section: 'Next steps', tokens: '{recommendation} · {contactName} · {contactTitle} · {contactEmail} · {contactPhone}' },
  { section: 'Solution overview & Project plan visual', tokens: 'No tokens — drawn by the app (solution tower / roadmap) and spliced in' },
]

function UploadCard() {
  const upload = useUploadPptxDeckTemplate()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [deckKind, setDeckKind] = useState<DeckKind>('full_proposal')

  async function handleUpload() {
    if (!file) return toast.error('Select a .potx or .pptx file')
    if (!name.trim()) return toast.error('Name is required')
    try {
      await upload.mutateAsync({ file, name: name.trim(), deckKind })
      toast.success('Template uploaded — map its slides to sections next')
      setFile(null)
      setName('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload PowerPoint template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FileUploadZone
          onFile={(f) => { setFile(f); if (!name) setName(f.name.replace(/\.[^.]+$/, '')) }}
          selectedName={file?.name}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Deck kind</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={deckKind}
              onChange={(e) => setDeckKind(e.target.value as DeckKind)}
            >
              <option value="full_proposal">Full proposal</option>
              <option value="board_summary">Board summary</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleUpload} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PptxTemplatesPage() {
  const { data, isLoading, error } = usePptxDeckTemplates()
  const del = useDeletePptxDeckTemplate()
  const isAdmin = useIsAdmin()
  const templates = data ?? []

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id)
      toast.success('Template deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a branded <span className="font-medium">.potx / .pptx</span> whose slides carry{' '}
        <code className="rounded bg-muted px-1">{'{placeholder}'}</code> tokens, map each proposal section to a slide,
        and flag generic slides to include as-is. When a template is <span className="font-medium">active</span>, that
        deck kind is generated from it (replacing the built-in design); the timeline and solution-tower visuals are
        spliced in from the app.
      </p>
      <AdminNotice />

      {isAdmin && <UploadCard />}

      {error ? (
        <ErrorMessage message="Failed to load templates" />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : templates.length === 0 ? (
        <EmptyState message="No PowerPoint templates yet" hint="Upload a .potx to get started." />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <Link href={`/settings/templates/pptx/${t.id}`} className="flex flex-1 items-start gap-3">
                  <Presentation className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">{KIND_LABEL[t.deckKind] ?? t.deckKind}</Badge>
                      {t.isActive && (
                        <Badge className="mr-2">
                          <CheckCircle2 className="mr-1 h-3 w-3" />Active
                        </Badge>
                      )}
                      {t.slides.length} slides
                      {Object.keys(t.mapping.sectionMap).length > 0 ? ` · ${Object.keys(t.mapping.sectionMap).length} mapped` : ' · not mapped'}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <Button variant="ghost" size="icon" aria-label="Delete template" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" render={<Link href={`/settings/templates/pptx/${t.id}`} aria-label="Open" />}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Placeholder reference ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token syntax</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <span className="font-medium text-foreground">Simple token</span> —{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{customerName}'}</code> is replaced with one value.
            </li>
            <li>
              <span className="font-medium text-foreground">Loop</span> — everything between{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{#name}'}</code> …{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{/name}'}</code> repeats once per item; the inner{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{field}'}</code> tokens are only valid inside the loop.
            </li>
            <li>
              <span className="font-medium text-foreground">Table loops</span> (marked “table”) must wrap a{' '}
              <span className="font-medium">table row</span>: put{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{#name}'}</code> in the first cell and{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{/name}'}</code> in the last cell of the repeating row.
            </li>
            <li>Type or paste each token in one go so PowerPoint doesn’t split it mid-word.</li>
            <li>Generic “include as-is” slides need no tokens.</li>
            <li>
              Raw codes: CRIM <code className="rounded bg-muted px-1 text-xs">{'{type}'}</code> is C/R/I/M,{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{complexity}'}</code> is low/med/high, and risk{' '}
              <code className="rounded bg-muted px-1 text-xs">{'{impact}'}</code> is low/medium/high.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All placeholders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {PLACEHOLDER_REFERENCE.map((p) => (
              <div key={p.tag} className="flex items-baseline gap-2 text-sm">
                <code className="rounded bg-muted px-1 text-xs">{p.tag}</code>
                <span className="text-muted-foreground">{p.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tokens by section</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            When you map a section to a slide, put that section’s tokens on the slide.
          </p>
          <div className="space-y-1.5">
            {SECTION_TOKENS.map((s) => (
              <div key={s.section} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-3">
                <span className="text-sm font-medium">{s.section}</span>
                <code className="text-xs text-muted-foreground">{s.tokens}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
