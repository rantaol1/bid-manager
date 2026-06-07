import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { ProposalData } from '@/lib/documents/proposal-data'

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
  { tag: '{#roles}{roleName} — {totalDays}d{/roles}', description: 'Team roles (name, days, cost)' },
  { tag: '{#phases}{phaseName}{/phases}', description: 'Project phases (name, dates, days, cost)' },
]

/** Build the flat data object passed to docxtemplater from resolved proposal data. */
export function buildTemplateData(data: ProposalData, companyName: string) {
  const { summary, scope, content, narrative, meta } = data
  const es = narrative.executiveSummary
  const executiveSummary = es
    ? [es.opportunity, es.whatWePropose, es.howWeDeliver, es.investment, es.whyArcwide].filter(Boolean).join('\n\n')
    : ''

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
      cells: content.raci.columns.map((c) => `${c.label}: ${r.cells[c.id] || '-'}`).join('; '),
    })),
    crims: content.crims.map((c) => ({ type: c.type, name: c.name, description: c.description ?? '', complexity: c.complexity })),
    roles: summary.roles.map((r) => ({
      roleName: r.roleName,
      totalDays: Math.round(r.totalDays),
      totalCost: formatCurrency(r.totalCost, summary.currency),
    })),
    phases: summary.phases.map((p) => ({
      phaseName: p.phaseName,
      rolloutName: p.rolloutName,
      workingDays: p.workingDays,
      totalDays: Math.round(p.totalDays),
      totalCost: formatCurrency(p.totalCost, summary.currency),
    })),
  }
}
