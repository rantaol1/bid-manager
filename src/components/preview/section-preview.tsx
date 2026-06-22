'use client'

import { IFS_MODULES } from '@/lib/constants/ifs-modules'
import { formatCurrency } from '@/lib/utils'
import { formatRaciCell } from '@/lib/raci'
import { DEFAULT_RISKS } from '@/lib/documents/slides/static-content'
import type { ProposalData } from '@/lib/documents/proposal-data'
import { ClipboardList, Gauge, MapPin } from 'lucide-react'
import { BRAND } from '@/lib/documents/slides/shared/branding'
import { computeOrgLayout, type OrgConnector } from '@/lib/documents/slides/shared/org-chart-layout'
import { applyGovTokens } from '@/lib/governance'
import { SlideCanvas, Box, inch } from './slide-canvas'
import { RichTextView } from './rich-text-view'
import { PreviewTower } from './preview-tower'
import {
  PreviewSectionLabel,
  PreviewTitle,
  PreviewFooter,
  PreviewPlaceholder,
  PreviewTable,
  PreviewBullets,
  PreviewCards,
  PreviewSteps,
  PreviewCallout,
  PreviewChevrons,
} from './primitives'

const MODULE_BY_ID = new Map<string, (typeof IFS_MODULES)[number]>(IFS_MODULES.map((m) => [m.id, m]))
const FITGAP_LABEL: Record<string, string> = { fit: 'Fit', partial: 'Partial', gap: 'Gap' }
const PRIORITY_LABEL: Record<string, string> = { must: 'Must', should: 'Should', could: 'Could', wont: "Won't" }
const CRIM_TYPE_LABEL: Record<string, string> = { C: 'Customisation', R: 'Report', I: 'Integration', M: 'Migration' }
const COMPLEXITY_LABEL: Record<string, string> = { low: 'Low', med: 'Medium', high: 'High' }
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function selectedModules(data: ProposalData) {
  return IFS_MODULES.filter((m) => data.scope.modules[m.id]?.selected).map((m) => ({ ...m, fitGap: data.scope.modules[m.id]?.fitGap }))
}

function costByRollout(data: ProposalData): Array<[string, number]> {
  const map = new Map<string, number>()
  for (const p of data.summary.phases) map.set(p.rolloutName, (map.get(p.rolloutName) ?? 0) + p.totalCost)
  return [...map.entries()]
}

/** Two-column header + bullets helper. */
function TwoCol({ leftTitle, rightTitle, left, right }: { leftTitle: string; rightTitle: string; left: string[]; right: string[] }) {
  return (
    <>
      <Box x={0.5} y={1.35} w={4.3} style={{ fontSize: 13, fontWeight: 700, color: `#${BRAND.black}` }}>{leftTitle}</Box>
      <Box x={5.2} y={1.35} w={4.3} style={{ fontSize: 13, fontWeight: 700, color: `#${BRAND.black}` }}>{rightTitle}</Box>
      <PreviewBullets items={left.length ? left : ['None recorded']} x={0.5} y={1.75} w={4.3} fontSize={11} />
      <PreviewBullets items={right.length ? right : ['None recorded']} x={5.2} y={1.75} w={4.3} fontSize={11} />
    </>
  )
}

function Commercials({ data }: { data: ProposalData }) {
  const { projectTotalCost, currency, durationMonths } = data.summary
  const rollouts = costByRollout(data)
  return (
    <>
      <PreviewSectionLabel label="Commercials" />
      <PreviewTitle title="Indicative investment" />
      <PreviewCallout text={formatCurrency(projectTotalCost, currency)} />
      <Box x={0.5} y={2.25} w={4.2} style={{ fontSize: 11, color: `#${BRAND.midGray}` }}>{`Indicative total over ~${durationMonths} months`}</Box>
      {rollouts.length > 0 && (
        <PreviewTable
          headers={['Cost element', 'Amount']}
          rows={rollouts.map(([name, cost]) => [name, formatCurrency(cost, currency)])}
          x={5.0}
          y={1.35}
          w={4.5}
          colW={[3.0, 1.5]}
        />
      )}
      <Box x={0.5} y={3.4} w={9}>
        <RichTextView value={data.narrative.commercialModel} placeholder="[Describe the commercial model in the Proposal tab.]" fontSize={12} color={`#${BRAND.darkGray}`} />
      </Box>
    </>
  )
}

const GOV_ICON: Record<string, typeof ClipboardList> = { clipboard: ClipboardList, gauge: Gauge, pin: MapPin }

/** Three-column governance bodies table — mirrors governanceSlide() in chapter2.ts. */
function GovernanceTable({ data }: { data: ProposalData }) {
  const bodies = data.content.governance.bodies
  const tok = { customer: data.meta.customerName, partner: data.branding.companyName }
  if (bodies.length === 0) return <PreviewPlaceholder message="Add governance bodies in the Proposal tab to populate this slide." />

  const tableX = 0.5
  const gutterW = 0.3
  const colsX = tableX + gutterW
  const colsW = 9.0 - gutterW
  const colW = colsW / bodies.length
  const pad = 0.14

  const startY = 1.4
  const headerH = 0.6
  const cadenceH = 0.28
  const partH = 1.75
  const respH = 1.12
  const cadenceY = startY + headerH
  const partY = cadenceY + cadenceH
  const dividerY = partY + 0.95
  const respY = partY + partH

  const gutterLabel = (text: string, y: number, h: number, color: string) => (
    <Box x={tableX} y={y} w={gutterW} h={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 8, fontWeight: 700, letterSpacing: 1, color }}>{text.toUpperCase()}</span>
    </Box>
  )

  const bullets = (items: string[], color: string, underlineFirst: boolean, fontSize: number) => (
    <ul style={{ margin: 0, paddingLeft: 12, listStyle: 'disc', color, fontSize }}>
      {items.map((line, i) => {
        const t = applyGovTokens(line, tok)
        const sp = t.indexOf(' ')
        const first = underlineFirst && sp !== -1 ? t.slice(0, sp) : underlineFirst ? t : ''
        const rest = underlineFirst && sp !== -1 ? t.slice(sp) : ''
        return (
          <li key={i} style={{ marginBottom: 3, lineHeight: 1.2 }}>
            {underlineFirst ? (<><span style={{ textDecoration: 'underline' }}>{first}</span>{rest}</>) : t}
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      {/* Magenta bands */}
      <Box x={tableX} y={startY} w={9.0} h={headerH} style={{ background: `#${BRAND.magenta}` }} />
      <Box x={tableX} y={respY} w={9.0} h={respH} style={{ background: `#${BRAND.magenta}` }} />
      {gutterLabel('Type', startY, headerH, `#${BRAND.white}`)}
      {gutterLabel('Participants', partY, partH, `#${BRAND.magenta}`)}
      {gutterLabel('Responsabilities', respY, respH, `#${BRAND.white}`)}
      {/* Divider between customer and partner participants */}
      <Box x={colsX} y={dividerY} w={colsW} style={{ borderTop: `1px solid #${BRAND.magenta}` }} />

      {bodies.map((b, i) => {
        const x = colsX + i * colW
        const Icon = GOV_ICON[b.icon] ?? ClipboardList
        return (
          <div key={i}>
            <Box x={x + pad} y={startY} w={colW - pad * 2} h={headerH} style={{ display: 'flex', alignItems: 'center', gap: inch(0.1) }}>
              <Icon size={inch(0.26)} color={`#${BRAND.white}`} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: `#${BRAND.white}`, lineHeight: 1.1 }}>{b.name.toUpperCase()}</span>
            </Box>
            <Box x={x + pad} y={cadenceY} w={colW - pad * 2} h={cadenceH} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, letterSpacing: 2, color: `#${BRAND.midGray}` }}>
              {b.cadence.toUpperCase()}
            </Box>
            <Box x={x + pad} y={partY + 0.05} w={colW - pad * 2}>{bullets(b.customerParticipants, `#${BRAND.darkGray}`, false, 9)}</Box>
            <Box x={x + pad} y={dividerY + 0.08} w={colW - pad * 2}>{bullets(b.partnerParticipants, `#${BRAND.darkGray}`, false, 9)}</Box>
            <Box x={x + pad} y={respY + 0.08} w={colW - pad * 2}>{bullets(b.responsibilities, `#${BRAND.white}`, true, 8.5)}</Box>
          </div>
        )
      })}
    </>
  )
}

/** A single axis-aligned org-chart connector (thin gray line + optional arrowheads). */
function OrgLine({ c }: { c: OrgConnector }) {
  const x = Math.min(c.x1, c.x2)
  const y = Math.min(c.y1, c.y2)
  const horizontal = c.y1 === c.y2
  const len = horizontal ? Math.abs(c.x2 - c.x1) : Math.abs(c.y2 - c.y1)
  const color = `#${BRAND.midGray}`
  const tri = (dir: 'up' | 'left' | 'right') => {
    const s = 4
    const base: React.CSSProperties = { position: 'absolute', width: 0, height: 0 }
    if (dir === 'up') return { ...base, left: -s, top: -s, borderLeft: `${s}px solid transparent`, borderRight: `${s}px solid transparent`, borderBottom: `${s + 1}px solid ${color}` }
    if (dir === 'left') return { ...base, top: -s, left: -s, borderTop: `${s}px solid transparent`, borderBottom: `${s}px solid transparent`, borderRight: `${s + 1}px solid ${color}` }
    return { ...base, top: -s, right: -s, borderTop: `${s}px solid transparent`, borderBottom: `${s}px solid transparent`, borderLeft: `${s + 1}px solid ${color}` }
  }
  // 'end' arrowhead sits at the min corner for our axis-aligned lines.
  const atBegin = c.x2 <= c.x1 && c.y2 <= c.y1
  return (
    <Box x={x} y={y} style={{ width: horizontal ? inch(len) : 1.5, height: horizontal ? 1.5 : inch(len) }}>
      <div style={{ position: 'absolute', inset: 0, background: color }} />
      {(c.arrow === 'end' && atBegin && !horizontal) && <span style={{ ...tri('up') }} />}
      {(c.arrow === 'end' && atBegin && horizontal) && <span style={{ ...tri('left') }} />}
      {c.arrow === 'both' && (
        <>
          <span style={{ ...tri('left') }} />
          <span style={{ ...tri('right'), left: inch(len) }} />
        </>
      )}
    </Box>
  )
}

/** Project-organisation org chart — mirrors teamStructureSlide() in chapter2.ts. */
function TeamStructure({ data }: { data: ProposalData }) {
  const tok = { customer: data.meta.customerName, partner: data.branding.companyName }
  const { boxes, connectors } = computeOrgLayout(data.content.teamStructure, tok)
  if (boxes.length === 0) return <PreviewPlaceholder message="Add teams in the Proposal tab to populate the organisation chart." />

  return (
    <>
      {connectors.map((c, i) => (
        <OrgLine key={`c${i}`} c={c} />
      ))}
      {boxes.map((b, i) => {
        if (b.kind === 'plain') {
          return (
            <Box key={i} x={b.x} y={b.y} w={b.w} h={b.h} style={{ background: `#${b.fill}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: `#${BRAND.white}`, textAlign: 'center', lineHeight: 1.05 }}>{b.label}</span>
            </Box>
          )
        }
        if (b.kind === 'arrow') {
          return (
            <Box key={i} x={b.x} y={b.y} w={b.w} h={b.h} style={{ background: `#${b.fill}`, clipPath: `polygon(0 50%, ${inch(b.h)}px 0, ${inch(b.h)}px 25%, calc(100% - ${inch(b.h)}px) 25%, calc(100% - ${inch(b.h)}px) 0, 100% 50%, calc(100% - ${inch(b.h)}px) 100%, calc(100% - ${inch(b.h)}px) 75%, ${inch(b.h)}px 75%, ${inch(b.h)}px 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: `#${BRAND.white}` }}>{b.label}</span>
            </Box>
          )
        }
        // team box
        const headerH = b.headerH ?? 0.3
        const rows = b.rows ?? []
        const bodyH = b.h - headerH - 0.12
        const rowFont = Math.min(8, Math.max(5, (bodyH * 72) / Math.max(1, rows.length)) * 0.82)
        return (
          <Box key={i} x={b.x} y={b.y} w={b.w} h={b.h} style={{ background: `#${BRAND.white}`, border: `1px solid #${b.fill}`, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: inch(headerH), background: `#${b.fill}`, color: `#${BRAND.white}`, fontSize: 8.5, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 4px' }}>
              {b.label.toUpperCase()}
            </div>
            <div style={{ padding: `${inch(0.06)}px ${inch(0.08)}px`, fontSize: rowFont, lineHeight: 1.05 }}>
              {rows.map((r, j) => (
                <div key={j} style={{ fontWeight: r.bold ? 700 : 400, color: r.indent ? `#${BRAND.midGray}` : `#${BRAND.black}`, paddingLeft: r.indent ? 8 : 0, marginBottom: 1 }}>
                  {r.indent ? '– ' : ''}
                  {r.text}
                </div>
              ))}
            </div>
          </Box>
        )
      })}
    </>
  )
}

function renderBody(key: string, data: ProposalData) {
  const { content, narrative, summary, scope, meta } = data
  switch (key) {
    /* ---- narrative ---- */
    case 'executiveSummary': {
      const es = narrative.executiveSummary
      const inv = `Indicative investment of ${formatCurrency(summary.projectTotalCost, summary.currency)} over approximately ${summary.durationMonths} months.`
      return (
        <>
          <PreviewSectionLabel label="Executive Summary" />
          <PreviewTitle title="Executive summary" />
          <PreviewBullets
            y={1.4}
            fontSize={13}
            items={[
              `The opportunity — ${es?.opportunity?.trim() || '[add the customer’s situation and goals]'}`,
              `What we propose — ${es?.whatWePropose?.trim() || '[summarise the proposed IFS Cloud solution]'}`,
              `How we deliver — ${es?.howWeDeliver?.trim() || '[describe the delivery approach and timeline]'}`,
              `Investment — ${es?.investment?.trim() || inv}`,
              `Why Arcwide — ${es?.whyArcwide?.trim() || '[state the differentiators]'}`,
            ]}
          />
        </>
      )
    }
    case 'understanding':
      return (
        <>
          <PreviewSectionLabel label="Understanding" />
          <PreviewTitle title="Our understanding" />
          <Box x={0.5} y={1.4} w={9}>
            <RichTextView value={narrative.understanding} placeholder="[Add a narrative about the customer’s business, challenges and objectives.]" fontSize={13} color={`#${BRAND.darkGray}`} />
          </Box>
          <PreviewCards
            y={3.55}
            cols={3}
            h={1.3}
            cards={[
              { title: 'Industry', description: meta.customerIndustry || 'Not specified' },
              { title: 'Country', description: meta.customerCountry || 'Not specified' },
              { title: 'Modules in scope', description: `${selectedModules(data).length} IFS Cloud modules` },
            ]}
          />
        </>
      )
    case 'valueDrivers': {
      const drivers = narrative.valueDrivers
      return (
        <>
          <PreviewSectionLabel label="Value" />
          <PreviewTitle title="Business drivers → target outcomes" />
          {drivers.length === 0 ? (
            <PreviewPlaceholder message="Add up to four business drivers to populate this slide." />
          ) : (
            <PreviewTable
              headers={['Business driver', 'IFS capability', 'Target outcome']}
              rows={drivers.map((d) => [d.driver || '—', d.ifsCapability || '—', d.targetOutcome || '—'])}
              y={1.4}
              colW={[3, 3, 3]}
              fontSize={12}
            />
          )}
        </>
      )
    }
    case 'commercialModel':
    case 'commercials':
      return <Commercials data={data} />
    case 'recommendation':
      return (
        <>
          <PreviewSectionLabel label="Recommendation" />
          <PreviewTitle title="Recommendation & next steps" />
          <Box x={0.5} y={1.4} w={9}>
            <RichTextView value={narrative.recommendation} placeholder="[Add the recommendation statement in the Proposal tab.]" fontSize={14} color={`#${BRAND.darkGray}`} />
          </Box>
          <PreviewSteps y={3.2} h={1.7} steps={['Board decision', 'Commercial negotiation', 'Contract & mobilise', 'Initiate']} />
        </>
      )
    case 'teamReferences': {
      const people = narrative.teamProfiles
      const refs = narrative.references
      return (
        <>
          <PreviewSectionLabel label="References" />
          <PreviewTitle title="Key people & references" />
          <Box x={0.5} y={1.3} w={9} style={{ fontSize: 13, fontWeight: 700, color: `#${BRAND.black}` }}>Key people</Box>
          {people.length ? (
            <PreviewCards y={1.65} cols={Math.min(people.length, 4)} h={0.95} cards={people.map((p) => ({ title: p.name || '—', description: p.role || '' }))} />
          ) : (
            <PreviewPlaceholder message="Add key people in the Proposal tab." y={1.7} />
          )}
          <Box x={0.5} y={2.85} w={9} style={{ fontSize: 13, fontWeight: 700, color: `#${BRAND.black}` }}>References</Box>
          {refs.length ? (
            <PreviewTable headers={['Client', 'Scope', 'Outcome']} rows={refs.map((r) => [r.name || '—', r.scope || '—', r.outcome || '—'])} y={3.2} colW={[2.2, 3.4, 3.4]} fontSize={10.5} />
          ) : (
            <PreviewPlaceholder message="Add reference stories in the Proposal tab." y={3.25} />
          )}
        </>
      )
    }
    case 'contact': {
      const lines = [narrative.contactName, narrative.contactTitle, narrative.contactEmail, narrative.contactPhone].filter(Boolean).join('  ·  ')
      return (
        <>
          <PreviewSectionLabel label="Next Steps" />
          <PreviewTitle title="The path forward" />
          <PreviewSteps y={1.6} h={1.8} steps={['Board decision', 'Commercial negotiation', 'Contract & mobilise', 'Initiate']} />
          <Box x={0.5} y={3.9} w={9} style={{ fontSize: 12, color: `#${BRAND.darkGray}`, fontStyle: lines ? 'normal' : 'italic' }}>
            {lines || '[Add contact details in the Proposal tab.]'}
          </Box>
        </>
      )
    }

    /* ---- structured ---- */
    case 'raci': {
      const { columns, rows } = content.raci
      if (!rows.length || !columns.length) return <><PreviewSectionLabel label="RACI" /><PreviewTitle title="RACI matrix" /><PreviewPlaceholder message="Add RACI activities and roles." /></>
      const activityW = 2.6
      const colW = Math.max(0.6, (9.0 - activityW) / columns.length)
      return (
        <>
          <PreviewSectionLabel label="RACI" />
          <PreviewTitle title="RACI matrix" />
          <PreviewTable
            headers={['Activity', ...columns.map((c) => c.label)]}
            rows={rows.map((r) => [r.activity, ...columns.map((c) => formatRaciCell(r.cells[c.id]))])}
            y={1.4}
            colW={[activityW, ...columns.map(() => colW)]}
            fontSize={columns.length > 6 ? 8 : 9}
          />
        </>
      )
    }
    case 'crims': {
      const crims = content.crims
      return (
        <>
          <PreviewSectionLabel label="CRIMs" />
          <PreviewTitle title="Customisations, reports, integrations & migrations" />
          {crims.length === 0 ? (
            <PreviewPlaceholder message="Add CRIM items to populate this register." />
          ) : (
            <PreviewTable
              headers={['Type', 'Item', 'Description', 'Complexity']}
              rows={crims.slice(0, 12).map((cr) => [CRIM_TYPE_LABEL[cr.type] ?? cr.type, cr.name, cr.description ?? '—', COMPLEXITY_LABEL[cr.complexity] ?? cr.complexity])}
              y={1.4}
              colW={[1.6, 2.4, 3.8, 1.2]}
              fontSize={10}
            />
          )}
        </>
      )
    }
    case 'methodologyPhases':
      return (
        <>
          <PreviewSectionLabel label="Methodology" />
          <PreviewTitle title="IFS Cloud methodology" />
          <PreviewTable headers={['Phase', 'Focus', 'Key deliverables']} rows={content.methodologyPhases.map((p) => [p.phase, p.focus, p.deliverables])} y={1.4} colW={[2, 3.5, 3.5]} fontSize={10.5} />
        </>
      )
    case 'waysOfWorking':
      return (
        <>
          <PreviewSectionLabel label="Ways of Working" />
          <PreviewTitle title="The Arcwide delivery wrap" />
          <PreviewCards y={1.5} cols={2} h={1.5} rowGap={0.3} cards={content.waysOfWorking} />
        </>
      )
    case 'governance':
      return (
        <>
          <PreviewSectionLabel label="Governance" />
          <PreviewTitle title="Project governance" />
          <GovernanceTable data={data} />
        </>
      )
    case 'teamStructure':
      return (
        <>
          <PreviewSectionLabel label="Organisation" />
          <PreviewTitle title="Project organisation" />
          <TeamStructure data={data} />
        </>
      )
    case 'customerCommitments':
      return (
        <>
          <PreviewSectionLabel label="Customer" />
          <PreviewTitle title="What we need from you" />
          <PreviewCards y={1.4} cols={3} h={1.5} rowGap={0.3} cards={content.customerCommitments} />
        </>
      )
    case 'whyArcwide':
      return (
        <>
          <PreviewSectionLabel label="Why Arcwide" />
          <PreviewTitle title="Why Arcwide" />
          <PreviewCards y={1.4} cols={2} h={1.5} rowGap={0.3} cards={content.whyArcwide} />
        </>
      )
    case 'dataMigrationSteps':
      return <Steps label="Data Migration" title="Data migration approach" steps={content.dataMigrationSteps} />
    case 'integrationSteps':
      return <Steps label="Integration" title="Integration approach" steps={content.integrationSteps} />
    case 'testingSteps':
      return <Steps label="Quality" title="Quality assurance & testing" steps={content.testingSteps} />
    case 'adoptionSteps':
      return <Steps label="Adoption" title="Training & change management" steps={content.adoptionSteps} />
    case 'goLiveSteps':
      return <Steps label="Go Live" title="Cutover & hypercare" steps={content.goLiveSteps} />

    /* ---- data-driven (other tabs) ---- */
    case 'solution_overview': {
      const mods = selectedModules(data)
      if (!mods.length) return <><PreviewSectionLabel label="Solution" /><PreviewTitle title="Solution set overview & phasing" /><PreviewPlaceholder message="Assign modules to phases in the Scope tab." /></>
      // Full-bleed: the legend acts as the header, so the tower gets the whole canvas.
      return <PreviewTower scope={scope} box={{ x: 0.1, y: 0.1, w: 9.8, h: 5.0 }} />
    }
    case 'scope_in': {
      const mods = selectedModules(data)
      if (!mods.length) return <><PreviewSectionLabel label="Scope" /><PreviewTitle title="In scope — by module" /><PreviewPlaceholder message="Select modules in the Scope tab." /></>
      return (
        <>
          <PreviewSectionLabel label="Scope" />
          <PreviewTitle title="In scope — by module" />
          <PreviewTable headers={['Module', 'In-scope processes', 'Fit']} rows={mods.map((m) => [m.name, m.description, m.fitGap ? FITGAP_LABEL[m.fitGap] : '—'])} y={1.4} colW={[2.2, 5.6, 1.2]} fontSize={10.5} />
        </>
      )
    }
    case 'scope_out': {
      const deferred = scope.deferred
      return (
        <>
          <PreviewSectionLabel label="Scope" />
          <PreviewTitle title="Out of scope & deferred" />
          <TwoCol leftTitle="Explicitly out of scope" rightTitle="Deferred to a later phase" left={scope.exclusions} right={deferred} />
        </>
      )
    }
    case 'assumptions': {
      const a = scope.assumptions
      if (!a.length) return <><PreviewSectionLabel label="Assumptions" /><PreviewTitle title="Assumptions & dependencies" /><PreviewPlaceholder message="Add assumptions in the Scope tab." /></>
      const half = Math.ceil(a.length / 2)
      return (
        <>
          <PreviewSectionLabel label="Assumptions" />
          <PreviewTitle title="Assumptions & dependencies" />
          <PreviewBullets items={a.slice(0, half)} x={0.5} y={1.4} w={4.3} fontSize={12} />
          <PreviewBullets items={a.slice(half)} x={5.2} y={1.4} w={4.3} fontSize={12} />
        </>
      )
    }
    case 'fit_assessment': {
      const reqs = scope.requirements
      if (!reqs.length) return <><PreviewSectionLabel label="Fit Assessment" /><PreviewTitle title="High-level fit assessment" /><PreviewPlaceholder message="Add requirements in the Scope tab." /></>
      return (
        <>
          <PreviewSectionLabel label="Fit Assessment" />
          <PreviewTitle title="High-level fit assessment" />
          <PreviewTable
            headers={['Requirement', 'Module', 'Priority', 'Fit']}
            rows={reqs.slice(0, 12).map((r) => [r.title, r.moduleId ? MODULE_BY_ID.get(r.moduleId)?.name ?? r.moduleId : '—', PRIORITY_LABEL[r.priority] ?? r.priority, FITGAP_LABEL[r.fitGap] ?? r.fitGap])}
            y={1.4}
            colW={[4.4, 2.2, 1.2, 1.2]}
            fontSize={10.5}
          />
        </>
      )
    }
    case 'team': {
      const roles = summary.roles.filter((r) => r.totalDays > 0)
      if (!roles.length) return <><PreviewSectionLabel label="Team" /><PreviewTitle title="Proposed delivery team" /><PreviewPlaceholder message="Configure roles and allocations in the Estimation tab." /></>
      const wd = Math.max(1, summary.durationMonths * 21)
      return (
        <>
          <PreviewSectionLabel label="Team" />
          <PreviewTitle title="Proposed delivery team" />
          <PreviewTable headers={['Role', 'Total days', 'Indicative FTE']} rows={roles.map((r) => [r.roleName, String(Math.round(r.totalDays)), (r.totalDays / wd).toFixed(1)])} y={1.4} colW={[5.4, 1.8, 1.8]} fontSize={11} />
        </>
      )
    }
    case 'risk': {
      const rows = scope.risks.length ? scope.risks.map((r) => [r.title, cap(r.impact), r.mitigation ?? '—']) : DEFAULT_RISKS.map((r) => [r.risk, r.impact, r.mitigation])
      return (
        <>
          <PreviewSectionLabel label="Risk" />
          <PreviewTitle title="Risk management" />
          <PreviewTable headers={['Risk', 'Impact', 'Mitigation']} rows={rows} y={1.4} colW={[3.4, 1.2, 4.4]} fontSize={10.5} />
        </>
      )
    }
    case 'plan':
      return (
        <>
          <PreviewSectionLabel label="Plan" />
          <PreviewTitle title="Indicative project plan" />
          <PreviewChevrons estimation={data.estimation} />
        </>
      )
    default:
      return <PreviewPlaceholder message="This slide is generated automatically from your opportunity data." />
  }
}

function Steps({ label, title, steps }: { label: string; title: string; steps: string[] }) {
  return (
    <>
      <PreviewSectionLabel label={label} />
      <PreviewTitle title={title} />
      <PreviewSteps y={2.0} h={2.0} steps={steps} />
    </>
  )
}

export function SectionPreview({
  editorKey,
  sectionId,
  data,
  slideNumber = 1,
}: {
  editorKey?: string
  sectionId?: string
  data: ProposalData
  slideNumber?: number
}) {
  const key = editorKey ?? sectionId ?? ''
  return (
    <SlideCanvas>
      {renderBody(key, data)}
      <PreviewFooter footer={data.branding.footerText} n={slideNumber} />
    </SlideCanvas>
  )
}
