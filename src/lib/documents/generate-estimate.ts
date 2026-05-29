import { Packer, Paragraph, PageBreak } from 'docx'
import { format } from 'date-fns'
import {
  brandedDocument,
  coverParagraphs,
  h1,
  h2,
  p,
  bullets,
  brandedTable,
  type TableColumn,
} from '@/lib/documents/docx-helpers'
import { daysForAllocation } from '@/lib/estimation'
import { formatCurrency } from '@/lib/utils'
import type { DocData } from '@/lib/documents/doc-data'

export async function generateEstimateDocx(data: DocData): Promise<Buffer> {
  const { estimation, summary, scope } = data
  const { opportunity, roleConfigs, rollouts } = estimation
  const currency = opportunity.currency
  const dateStr = format(new Date(), 'd MMMM yyyy')

  const allPhases = rollouts.flatMap((ro) => ro.phases.map((ph) => ({ ...ph, rolloutName: ro.name })))

  // Team table
  const teamCols: TableColumn[] = [
    { header: 'Role', width: 5000 },
    { header: 'Rate', width: 2000, align: 'right' },
    { header: 'Unit', width: 2000 },
  ]
  const teamRows = roleConfigs.map((r) => [r.roleName, formatCurrency(r.rate, currency), `per ${r.rateUnit}`])

  // Phases table
  const phaseCols: TableColumn[] = [
    { header: 'Rollout', width: 2400 },
    { header: 'Phase', width: 2400 },
    { header: 'Start', width: 1500 },
    { header: 'End', width: 1500 },
    { header: 'Working days', width: 1200, align: 'right' },
  ]
  const phaseRows = allPhases.map((ph) => [
    ph.rolloutName,
    ph.name,
    format(new Date(ph.startDate), 'dd/MM/yyyy'),
    format(new Date(ph.endDate), 'dd/MM/yyyy'),
    String(ph.workingDays),
  ])

  // Allocation matrix
  const roleWidth = Math.max(700, Math.floor(6000 / Math.max(1, roleConfigs.length)))
  const matrixCols: TableColumn[] = [
    { header: 'Phase', width: 2600 },
    ...roleConfigs.map((r) => ({ header: r.roleName, width: roleWidth, align: 'right' as const })),
    { header: 'Days', width: 1000, align: 'right' as const },
  ]
  const matrixRows = allPhases.map((ph) => {
    const allocByRole = new Map(ph.allocations.map((a) => [a.roleConfigId, a.percentage]))
    let phaseDays = 0
    const cells = roleConfigs.map((rc) => {
      const pct = allocByRole.get(rc.id) ?? 0
      phaseDays += daysForAllocation(pct, ph.workingDays)
      return pct > 0 ? `${pct}%` : '–'
    })
    return [ph.name, ...cells, phaseDays.toFixed(1)]
  })

  // Cost by phase
  const costPhaseCols: TableColumn[] = [
    { header: 'Phase', width: 5000 },
    { header: 'Days', width: 2000, align: 'right' },
    { header: 'Cost', width: 2000, align: 'right' },
  ]
  const costPhaseRows = summary.phases.map((ph) => [
    `${ph.rolloutName} · ${ph.phaseName}`,
    ph.totalDays.toFixed(1),
    formatCurrency(ph.totalCost, currency),
  ])

  // Cost by role
  const costRoleCols: TableColumn[] = [
    { header: 'Role', width: 4000 },
    { header: 'Total days', width: 1666, align: 'right' },
    { header: 'Rate', width: 1666, align: 'right' },
    { header: 'Total cost', width: 1668, align: 'right' },
  ]
  const costRoleRows = summary.roles
    .filter((r) => r.totalDays > 0)
    .map((r) => [
      r.roleName,
      r.totalDays.toFixed(1),
      formatCurrency(r.rate, currency),
      formatCurrency(r.totalCost, currency),
    ])

  const children: (Paragraph | ReturnType<typeof brandedTable>)[] = [
    ...coverParagraphs('Resource Estimate', opportunity.customerName, dateStr, 'v1.0'),
    new Paragraph({ children: [new PageBreak()] }),

    h1('Executive summary'),
    p(
      `This document presents the resource estimate for the ${opportunity.name} engagement with ${opportunity.customerName}. ` +
        `The proposed delivery spans ${summary.durationMonths} months and ${summary.projectTotalDays.toFixed(0)} consultant days, ` +
        `for a total professional services investment of ${formatCurrency(summary.projectTotalCost, currency)}.`
    ),

    h1('Project team'),
    brandedTable(teamCols, teamRows),

    h1('Project phases'),
    brandedTable(phaseCols, phaseRows),

    h1('Allocation matrix'),
    p('Allocation shown as a percentage of each phase’s working days, with resulting consultant-days per phase.'),
    brandedTable(matrixCols, matrixRows),

    h1('Cost summary'),
    h2('By phase'),
    brandedTable(costPhaseCols, costPhaseRows),
    h2('By role'),
    brandedTable(costRoleCols, costRoleRows),
    p(`Grand total: ${formatCurrency(summary.projectTotalCost, currency)} · ${summary.projectTotalDays.toFixed(1)} days`, {
      bold: true,
      size: 24,
    }),
  ]

  if (scope.assumptions.length) {
    children.push(h1('Assumptions'), ...bullets(scope.assumptions))
  }
  if (scope.exclusions.length) {
    children.push(h1('Exclusions'), ...bullets(scope.exclusions))
  }

  const doc = brandedDocument(children)
  return Packer.toBuffer(doc)
}
