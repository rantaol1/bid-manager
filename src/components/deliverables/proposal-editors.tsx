'use client'

import { Plus, Trash2, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ProposalContentInput } from '@/lib/schemas/proposal'
import type { EditorKey } from '@/lib/documents/proposal-sections'
import { BUILTIN_STRUCTURED_CONTENT } from '@/lib/documents/slides/static-content'
import type {
  ProposalStructuredContent,
  RaciRow,
  RaciValue,
  CrimItem,
  CrimType,
  MethodologyPhase,
  TitledItem,
  GovernanceContent,
  ValueDriver,
  TeamProfile,
  ProposalReference,
  ExecutiveSummaryContent,
} from '@/types'

type Draft = Partial<ProposalContentInput>
type Update = (patch: Draft) => void

interface SectionEditorProps {
  editorKey: EditorKey
  content: Draft
  update: Update
  defaults: ProposalStructuredContent | undefined
  isAdmin: boolean
  onSaveDefault: (key: keyof ProposalStructuredContent, value: unknown) => void
}

const STRUCTURED_KEYS: Partial<Record<EditorKey, keyof ProposalStructuredContent>> = {
  raci: 'raci',
  crims: 'crims',
  methodologyPhases: 'methodologyPhases',
  waysOfWorking: 'waysOfWorking',
  governance: 'governance',
  customerCommitments: 'customerCommitments',
  dataMigrationSteps: 'dataMigrationSteps',
  integrationSteps: 'integrationSteps',
  testingSteps: 'testingSteps',
  adoptionSteps: 'adoptionSteps',
  goLiveSteps: 'goLiveSteps',
  whyArcwide: 'whyArcwide',
}

const selectClass =
  'h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/* ---------------- small primitives ---------------- */

function RowShell({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border p-2">
      <div className="flex-1 space-y-2">{children}</div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove} aria-label="Remove row">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="mt-1">
      <Plus className="h-4 w-4" /> {label}
    </Button>
  )
}

/** Wraps a structured (default-backed) block with status + reset/save-as-default. */
function StructuredWrapper({
  isOverride,
  isAdmin,
  onReset,
  onSaveDefault,
  children,
}: {
  isOverride: boolean
  isAdmin: boolean
  onReset: () => void
  onSaveDefault: () => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">
          {isOverride ? 'Using a custom version for this opportunity' : 'Using the global default'}
        </span>
        <div className="flex gap-1">
          {isOverride && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset to default
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSaveDefault}>
              <Save className="h-3.5 w-3.5" /> Save as default
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

/* ---------------- narrative editors ---------------- */

function ExecutiveSummaryEditor({ content, update }: { content: Draft; update: Update }) {
  const es: ExecutiveSummaryContent = content.executiveSummary ?? {
    opportunity: '',
    whatWePropose: '',
    howWeDeliver: '',
    investment: '',
    whyArcwide: '',
  }
  const set = (k: keyof ExecutiveSummaryContent, v: string) => update({ executiveSummary: { ...es, [k]: v } })
  const fields: Array<[keyof ExecutiveSummaryContent, string]> = [
    ['opportunity', 'The opportunity'],
    ['whatWePropose', 'What we propose'],
    ['howWeDeliver', 'How we deliver'],
    ['investment', 'Investment'],
    ['whyArcwide', 'Why Arcwide'],
  ]
  return (
    <div className="space-y-3">
      {fields.map(([k, label]) => (
        <div key={k}>
          <Label className="text-xs">{label}</Label>
          <Textarea className="mt-1" rows={2} value={es[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
        </div>
      ))}
    </div>
  )
}

function ValueDriversEditor({ content, update }: { content: Draft; update: Update }) {
  const rows: ValueDriver[] = content.valueDrivers ?? []
  const set = (next: ValueDriver[]) => update({ valueDrivers: next })
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <RowShell key={i} onRemove={() => set(rows.filter((_, j) => j !== i))}>
          <Input placeholder="Business driver" value={r.driver} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, driver: e.target.value } : x)))} />
          <Input placeholder="IFS capability" value={r.ifsCapability} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, ifsCapability: e.target.value } : x)))} />
          <Input placeholder="Target outcome" value={r.targetOutcome} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, targetOutcome: e.target.value } : x)))} />
        </RowShell>
      ))}
      {rows.length < 4 && <AddButton label="Add driver" onClick={() => set([...rows, { driver: '', ifsCapability: '', targetOutcome: '' }])} />}
    </div>
  )
}

function TeamReferencesEditor({ content, update }: { content: Draft; update: Update }) {
  const people: TeamProfile[] = content.teamProfiles ?? []
  const refs: ProposalReference[] = content.references ?? []
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Key people</Label>
        {people.map((p, i) => (
          <RowShell key={i} onRemove={() => update({ teamProfiles: people.filter((_, j) => j !== i) })}>
            <Input placeholder="Name" value={p.name} onChange={(e) => update({ teamProfiles: people.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <Input placeholder="Role" value={p.role} onChange={(e) => update({ teamProfiles: people.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })} />
          </RowShell>
        ))}
        {people.length < 6 && <AddButton label="Add person" onClick={() => update({ teamProfiles: [...people, { name: '', role: '' }] })} />}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-semibold">References</Label>
        {refs.map((r, i) => (
          <RowShell key={i} onRemove={() => update({ references: refs.filter((_, j) => j !== i) })}>
            <Input placeholder="Client" value={r.name} onChange={(e) => update({ references: refs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <Input placeholder="Scope" value={r.scope} onChange={(e) => update({ references: refs.map((x, j) => (j === i ? { ...x, scope: e.target.value } : x)) })} />
            <Input placeholder="Outcome" value={r.outcome} onChange={(e) => update({ references: refs.map((x, j) => (j === i ? { ...x, outcome: e.target.value } : x)) })} />
          </RowShell>
        ))}
        {refs.length < 3 && <AddButton label="Add reference" onClick={() => update({ references: [...refs, { name: '', scope: '', outcome: '' }] })} />}
      </div>
    </div>
  )
}

function ContactEditor({ content, update }: { content: Draft; update: Update }) {
  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Name</Label><Input className="mt-1" value={content.contactName ?? ''} onChange={(e) => update({ contactName: e.target.value })} /></div>
      <div><Label className="text-xs">Title</Label><Input className="mt-1" value={content.contactTitle ?? ''} onChange={(e) => update({ contactTitle: e.target.value })} /></div>
      <div><Label className="text-xs">Email</Label><Input className="mt-1" value={content.contactEmail ?? ''} onChange={(e) => update({ contactEmail: e.target.value })} /></div>
      <div><Label className="text-xs">Phone</Label><Input className="mt-1" value={content.contactPhone ?? ''} onChange={(e) => update({ contactPhone: e.target.value })} /></div>
    </div>
  )
}

/* ---------------- structured (default-backed) editors ---------------- */

const RACI_VALUES: RaciValue[] = ['', 'R', 'A', 'C', 'I']
const RACI_COLS: Array<[keyof Omit<RaciRow, 'activity'>, string]> = [
  ['execSponsor', 'Exec'],
  ['processOwner', 'Owner'],
  ['sme', 'SME'],
  ['arcwidePM', 'PM'],
  ['arcwideSA', 'SA'],
  ['arcwideConsultant', 'Cons.'],
]

function RaciEditor({ value, onChange }: { value: RaciRow[]; onChange: (v: RaciRow[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_repeat(6,2.5rem)_1.75rem] items-center gap-1 text-[10px] font-semibold text-muted-foreground">
        <span>Activity</span>
        {RACI_COLS.map(([, label]) => <span key={label} className="text-center">{label}</span>)}
        <span />
      </div>
      {value.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_repeat(6,2.5rem)_1.75rem] items-center gap-1">
          <Input className="h-8" value={row.activity} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, activity: e.target.value } : x)))} />
          {RACI_COLS.map(([col]) => (
            <select
              key={col}
              className={selectClass + ' w-10 px-1 text-center'}
              value={row[col]}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, [col]: e.target.value as RaciValue } : x)))}
            >
              {RACI_VALUES.map((v) => <option key={v} value={v}>{v || '–'}</option>)}
            </select>
          ))}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove row">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <AddButton label="Add activity" onClick={() => onChange([...value, { activity: '', execSponsor: '', processOwner: '', sme: '', arcwidePM: '', arcwideSA: '', arcwideConsultant: '' }])} />
    </div>
  )
}

const CRIM_TYPES: CrimType[] = ['C', 'R', 'I', 'M']
const CRIM_TYPE_LABEL: Record<CrimType, string> = { C: 'Customisation', R: 'Report', I: 'Integration', M: 'Migration' }

function CrimsEditor({ value, onChange }: { value: CrimItem[]; onChange: (v: CrimItem[]) => void }) {
  const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.round(Math.random() * 1000)))
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <RowShell key={c.id} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          <div className="flex gap-2">
            <select className={selectClass} value={c.type} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, type: e.target.value as CrimType } : x)))}>
              {CRIM_TYPES.map((t) => <option key={t} value={t}>{CRIM_TYPE_LABEL[t]}</option>)}
            </select>
            <Input className="flex-1" placeholder="Name" value={c.name} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <select className={selectClass} value={c.complexity} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, complexity: e.target.value as CrimItem['complexity'] } : x)))}>
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <Input placeholder="Description" value={c.description ?? ''} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
        </RowShell>
      ))}
      <AddButton label="Add CRIM" onClick={() => onChange([...value, { id: newId(), type: 'C', name: '', description: '', complexity: 'med' }])} />
    </div>
  )
}

function MethodologyEditor({ value, onChange }: { value: MethodologyPhase[]; onChange: (v: MethodologyPhase[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((p, i) => (
        <RowShell key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          <Input placeholder="Phase" value={p.phase} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, phase: e.target.value } : x)))} />
          <Input placeholder="Focus" value={p.focus} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, focus: e.target.value } : x)))} />
          <Input placeholder="Key deliverables" value={p.deliverables} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, deliverables: e.target.value } : x)))} />
        </RowShell>
      ))}
      <AddButton label="Add phase" onClick={() => onChange([...value, { phase: '', focus: '', deliverables: '' }])} />
    </div>
  )
}

function TitledItemsEditor({ value, onChange, max }: { value: TitledItem[]; onChange: (v: TitledItem[]) => void; max: number }) {
  return (
    <div className="space-y-2">
      {value.map((it, i) => (
        <RowShell key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
          <Input placeholder="Title" value={it.title} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <Textarea rows={2} placeholder="Description" value={it.description} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
        </RowShell>
      ))}
      {value.length < max && <AddButton label="Add item" onClick={() => onChange([...value, { title: '', description: '' }])} />}
    </div>
  )
}

function StringListEditor({ value, onChange, max }: { value: string[]; onChange: (v: string[]) => void; max: number }) {
  return (
    <div className="space-y-2">
      {value.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove step">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {value.length < max && <AddButton label="Add step" onClick={() => onChange([...value, ''])} />}
    </div>
  )
}

function GovernanceEditor({ value, onChange }: { value: GovernanceContent; onChange: (v: GovernanceContent) => void }) {
  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Steering Committee</Label><Textarea className="mt-1" rows={2} value={value.steering} onChange={(e) => onChange({ ...value, steering: e.target.value })} /></div>
      <div><Label className="text-xs">Joint PMO</Label><Textarea className="mt-1" rows={2} value={value.pmo} onChange={(e) => onChange({ ...value, pmo: e.target.value })} /></div>
      <div>
        <Label className="text-xs">Workstreams</Label>
        <div className="mt-1">
          <StringListEditor value={value.workstreams} onChange={(ws) => onChange({ ...value, workstreams: ws })} max={12} />
        </div>
      </div>
    </div>
  )
}

/* ---------------- dispatcher ---------------- */

export function SectionEditor({ editorKey, content, update, defaults, isAdmin, onSaveDefault }: SectionEditorProps) {
  // Narrative editors
  if (editorKey === 'executiveSummary') return <ExecutiveSummaryEditor content={content} update={update} />
  if (editorKey === 'understanding')
    return <Textarea rows={8} placeholder="Narrative about the customer’s business…" value={content.understanding ?? ''} onChange={(e) => update({ understanding: e.target.value })} />
  if (editorKey === 'commercialModel')
    return <Textarea rows={8} placeholder="Describe the commercial model…" value={content.commercialModel ?? ''} onChange={(e) => update({ commercialModel: e.target.value })} />
  if (editorKey === 'recommendation')
    return <Textarea rows={8} placeholder="Recommendation statement…" value={content.recommendation ?? ''} onChange={(e) => update({ recommendation: e.target.value })} />
  if (editorKey === 'valueDrivers') return <ValueDriversEditor content={content} update={update} />
  if (editorKey === 'teamReferences') return <TeamReferencesEditor content={content} update={update} />
  if (editorKey === 'contact') return <ContactEditor content={content} update={update} />

  // Structured (default-backed) editors
  const structKey = STRUCTURED_KEYS[editorKey]
  if (!structKey) {
    return <p className="text-sm text-muted-foreground">This slide is generated automatically from your opportunity data.</p>
  }

  // Fall back to built-in defaults so the editor always renders, even if the
  // global-defaults query is still loading or failed.
  const override = content[structKey as keyof Draft]
  const isOverride = override !== undefined && override !== null
  const fallback = defaults?.[structKey] ?? BUILTIN_STRUCTURED_CONTENT[structKey]
  const effective = (isOverride ? override : fallback) as never
  const setOverride = (v: unknown) => update({ [structKey]: v } as Draft)
  const reset = () => update({ [structKey]: null } as Draft)
  const saveDefault = () => onSaveDefault(structKey, effective)

  const wrap = (node: React.ReactNode) => (
    <StructuredWrapper isOverride={isOverride} isAdmin={isAdmin} onReset={reset} onSaveDefault={saveDefault}>
      {node}
    </StructuredWrapper>
  )

  switch (structKey) {
    case 'raci':
      return wrap(<RaciEditor value={effective} onChange={setOverride} />)
    case 'crims':
      return wrap(<CrimsEditor value={effective} onChange={setOverride} />)
    case 'methodologyPhases':
      return wrap(<MethodologyEditor value={effective} onChange={setOverride} />)
    case 'waysOfWorking':
      return wrap(<TitledItemsEditor value={effective} onChange={setOverride} max={8} />)
    case 'customerCommitments':
      return wrap(<TitledItemsEditor value={effective} onChange={setOverride} max={8} />)
    case 'whyArcwide':
      return wrap(<TitledItemsEditor value={effective} onChange={setOverride} max={6} />)
    case 'governance':
      return wrap(<GovernanceEditor value={effective} onChange={setOverride} />)
    case 'dataMigrationSteps':
    case 'integrationSteps':
    case 'testingSteps':
    case 'adoptionSteps':
    case 'goLiveSteps':
      return wrap(<StringListEditor value={effective} onChange={setOverride} max={8} />)
    default:
      return null
  }
}
