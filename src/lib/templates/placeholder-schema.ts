import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { formatRaciCell } from '@/lib/raci'
import { IFS_MODULES } from '@/lib/constants/ifs-modules'
import type { ProposalData } from '@/lib/documents/proposal-data'

const FITGAP_LABEL: Record<string, string> = { fit: 'Fit', partial: 'Partial', gap: 'Gap' }
const PRIORITY_LABEL: Record<string, string> = { must: 'Must', should: 'Should', could: 'Could', wont: "Won't" }
const MODULE_NAME = new Map(IFS_MODULES.map((m) => [m.id, m.name]))
const MODULE_DESC = new Map(IFS_MODULES.map((m) => [m.id, m.description]))

/**
 * Reference of every placeholder available in a DOCX template. Shown in the
 * Templates settings UI so users can author compatible `.docx` files. Loops use
 * docxtemplater section syntax: `{#items}{field}{/items}`.
 */
export const PLACEHOLDER_REFERENCE: Array<{ tag: string; description: string }> = [
  { tag: '{customerName}', description: 'Customer / account name' },
  { tag: '{opportunityName}', description: 'Opportunity name' },
  { tag: '{industry}', description: 'Customer industry' },
  { tag: '{country}', description: 'Customer country' },
  { tag: '{date}', description: 'Generation date' },
  { tag: '{companyName}', description: 'Your company name (from Branding settings)' },
  { tag: '{totalCost}', description: 'Total project cost (formatted)' },
  { tag: '{totalDays}', description: 'Total project days' },
  { tag: '{durationMonths}', description: 'Project duration in months' },
  { tag: '{teamSize}', description: 'Number of roles with allocation' },
  { tag: '{commercialModel}', description: 'Commercial model narrative' },
  { tag: '{recommendation}', description: 'Recommendation statement' },
  { tag: '{executiveSummary}', description: 'Executive summary (combined narrative)' },
  { tag: '{understanding}', description: 'Our-understanding narrative' },
  { tag: '{#modules}{name}{/modules}', description: 'In-scope modules (name, description)' },
  { tag: '{#assumptions}{text}{/assumptions}', description: 'Assumptions list' },
  { tag: '{#exclusions}{text}{/exclusions}', description: 'Exclusions list' },
  { tag: '{#risks}{title} — {mitigation}{/risks}', description: 'Risks (title, impact, mitigation)' },
  { tag: '{#raci}{activity}: {cells}{/raci}', description: 'RACI rows (activity + per-role values)' },
  { tag: '{#crims}{name}{/crims}', description: 'CRIM items (type, name, description, complexity)' },
  { tag: '{#roles}{roleName} — {totalDays}d{/roles}', description: 'Team roles (name, days, cost, fte)' },
  { tag: '{#phases}{phaseName}{/phases}', description: 'Project phases (name, dates, days, cost)' },
  // Executive summary parts (also available combined as {executiveSummary})
  { tag: '{esOpportunity}', description: 'Exec summary — the opportunity' },
  { tag: '{esWhatWePropose}', description: 'Exec summary — what we propose' },
  { tag: '{esHowWeDeliver}', description: 'Exec summary — how we deliver' },
  { tag: '{esInvestment}', description: 'Exec summary — investment' },
  { tag: '{esWhyArcwide}', description: 'Exec summary — why Arcwide' },
  // Narrative & structured collections (loops; table-row loops must sit inside a table)
  { tag: '{#valueDrivers}{driver} · {ifsCapability} · {targetOutcome}{/valueDrivers}', description: 'Business drivers → outcomes (table)' },
  { tag: '{#methodologyPhases}{phase} · {focus} · {deliverables}{/methodologyPhases}', description: 'Methodology phases (table)' },
  { tag: '{#waysOfWorking}{title}: {description}{/waysOfWorking}', description: 'Ways of working (cards)' },
  { tag: '{governanceSteering}', description: 'Governance — steering committee' },
  { tag: '{governancePmo}', description: 'Governance — joint PMO' },
  { tag: '{#governanceWorkstreams}{name}{/governanceWorkstreams}', description: 'Governance workstreams' },
  { tag: '{#customerCommitments}{title}: {description}{/customerCommitments}', description: 'Customer commitments' },
  { tag: '{#dataMigrationSteps}{step}{/dataMigrationSteps}', description: 'Data migration steps' },
  { tag: '{#integrationSteps}{step}{/integrationSteps}', description: 'Integration steps' },
  { tag: '{#testingSteps}{step}{/testingSteps}', description: 'Testing steps' },
  { tag: '{#adoptionSteps}{step}{/adoptionSteps}', description: 'Adoption steps' },
  { tag: '{#goLiveSteps}{step}{/goLiveSteps}', description: 'Go-live steps' },
  { tag: '{#whyArcwide}{title}: {description}{/whyArcwide}', description: 'Why Arcwide (cards)' },
  { tag: '{#team}{roleName} — {totalDays}d · {fte} FTE{/team}', description: 'Delivery team (table)' },
  { tag: '{#scopeIn}{name} · {description} · {fit}{/scopeIn}', description: 'In-scope modules (table)' },
  { tag: '{#deferred}{text}{/deferred}', description: 'Deferred-to-later items' },
  { tag: '{#fitAssessment}{title} · {module} · {priority} · {fit}{/fitAssessment}', description: 'Fit assessment (table)' },
  { tag: '{#teamProfiles}{name} — {role}{/teamProfiles}', description: 'Key people' },
  { tag: '{#references}{name} · {scope} · {outcome}{/references}', description: 'References' },
  { tag: '{contactName}', description: 'Contact name' },
  { tag: '{contactTitle}', description: 'Contact title' },
  { tag: '{contactEmail}', description: 'Contact email' },
  { tag: '{contactPhone}', description: 'Contact phone' },
]

/** Build the flat data object passed to docxtemplater from resolved proposal data. */
export function buildTemplateData(data: ProposalData, companyName: string) {
  const { summary, scope, content, narrative, meta } = data
  const es = narrative.executiveSummary
  const executiveSummary = es
    ? [es.opportunity, es.whatWePropose, es.howWeDeliver, es.investment, es.whyArcwide].filter(Boolean).join('\n\n')
    : ''
  const wd = Math.max(1, summary.durationMonths * 21)
  const team = summary.roles.map((r) => ({
    roleName: r.roleName,
    totalDays: Math.round(r.totalDays),
    totalCost: formatCurrency(r.totalCost, summary.currency),
    fte: (r.totalDays / wd).toFixed(1),
  }))
  const stepRows = (arr: string[]) => arr.map((step) => ({ step }))

  return {
    customerName: meta.customerName,
    opportunityName: meta.opportunityName,
    industry: meta.customerIndustry ?? '',
    country: meta.customerCountry ?? '',
    date: format(new Date(), 'd MMMM yyyy'),
    companyName,
    totalCost: formatCurrency(summary.projectTotalCost, summary.currency),
    totalDays: Math.round(summary.projectTotalDays),
    durationMonths: summary.durationMonths,
    teamSize: summary.roles.filter((r) => r.totalDays > 0).length,
    commercialModel: narrative.commercialModel ?? '',
    recommendation: narrative.recommendation ?? '',
    executiveSummary,
    understanding: narrative.understanding ?? '',
    modules: scope.selectedModuleNames.map((name) => ({ name, description: '' })),
    assumptions: scope.assumptions.map((text) => ({ text })),
    exclusions: scope.exclusions.map((text) => ({ text })),
    risks: scope.risks.map((r) => ({ title: r.title, impact: r.impact, mitigation: r.mitigation ?? '' })),
    raciColumns: content.raci.columns.map((c) => ({ label: c.label })),
    raci: content.raci.rows.map((r) => ({
      activity: r.activity,
      cells: content.raci.columns.map((c) => `${c.label}: ${formatRaciCell(r.cells[c.id]) || '-'}`).join('; '),
    })),
    crims: content.crims.map((c) => ({ type: c.type, name: c.name, description: c.description ?? '', complexity: c.complexity })),
    roles: team,
    team,
    phases: summary.phases.map((p) => ({
      phaseName: p.phaseName,
      rolloutName: p.rolloutName,
      workingDays: p.workingDays,
      totalDays: Math.round(p.totalDays),
      totalCost: formatCurrency(p.totalCost, summary.currency),
    })),
    // Executive summary parts (combined version above as `executiveSummary`).
    esOpportunity: es?.opportunity ?? '',
    esWhatWePropose: es?.whatWePropose ?? '',
    esHowWeDeliver: es?.howWeDeliver ?? '',
    esInvestment: es?.investment ?? '',
    esWhyArcwide: es?.whyArcwide ?? '',
    // Narrative collections
    valueDrivers: narrative.valueDrivers.map((v) => ({
      driver: v.driver,
      ifsCapability: v.ifsCapability,
      targetOutcome: v.targetOutcome,
    })),
    teamProfiles: narrative.teamProfiles.map((p) => ({ name: p.name, role: p.role })),
    references: narrative.references.map((r) => ({ name: r.name, scope: r.scope, outcome: r.outcome })),
    contactName: narrative.contactName ?? '',
    contactTitle: narrative.contactTitle ?? '',
    contactEmail: narrative.contactEmail ?? '',
    contactPhone: narrative.contactPhone ?? '',
    // Structured collections
    methodologyPhases: content.methodologyPhases.map((p) => ({ phase: p.phase, focus: p.focus, deliverables: p.deliverables })),
    waysOfWorking: content.waysOfWorking.map((w) => ({ title: w.title, description: w.description })),
    governanceSteering: content.governance.steering,
    governancePmo: content.governance.pmo,
    governanceWorkstreams: content.governance.workstreams.map((name) => ({ name })),
    customerCommitments: content.customerCommitments.map((c) => ({ title: c.title, description: c.description })),
    dataMigrationSteps: stepRows(content.dataMigrationSteps),
    integrationSteps: stepRows(content.integrationSteps),
    testingSteps: stepRows(content.testingSteps),
    adoptionSteps: stepRows(content.adoptionSteps),
    goLiveSteps: stepRows(content.goLiveSteps),
    whyArcwide: content.whyArcwide.map((w) => ({ title: w.title, description: w.description })),
    // Scope collections
    scopeIn: IFS_MODULES.filter((m) => scope.modules[m.id]?.selected).map((m) => ({
      name: m.name,
      description: MODULE_DESC.get(m.id) ?? '',
      fit: FITGAP_LABEL[scope.modules[m.id]?.fitGap ?? ''] ?? '',
    })),
    deferred: scope.deferred.map((text) => ({ text })),
    fitAssessment: scope.requirements.map((r) => ({
      title: r.title,
      module: r.moduleId ? MODULE_NAME.get(r.moduleId) ?? r.moduleId : '',
      priority: PRIORITY_LABEL[r.priority] ?? r.priority,
      fit: FITGAP_LABEL[r.fitGap] ?? r.fitGap,
    })),
  }
}
