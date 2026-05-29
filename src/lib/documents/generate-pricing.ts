import { Packer, Paragraph } from 'docx'
import { PageBreak } from 'docx'
import { format, addDays } from 'date-fns'
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
import { formatCurrency } from '@/lib/utils'
import type { DocData } from '@/lib/documents/doc-data'

export async function generatePricingDocx(data: DocData): Promise<Buffer> {
  const { estimation, summary, scope } = data
  const { opportunity, roleConfigs } = estimation
  const currency = opportunity.currency
  const dateStr = format(new Date(), 'd MMMM yyyy')
  const validUntil = format(addDays(new Date(), 90), 'd MMMM yyyy')

  const teamSize = summary.roles.filter((r) => r.totalDays > 0).length

  // Aggregate cost by rollout
  const rolloutTotals = new Map<string, { name: string; days: number; cost: number }>()
  for (const ph of summary.phases) {
    const t = rolloutTotals.get(ph.rolloutId) ?? { name: ph.rolloutName, days: 0, cost: 0 }
    t.days += ph.totalDays
    t.cost += ph.totalCost
    rolloutTotals.set(ph.rolloutId, t)
  }

  const overviewCols: TableColumn[] = [
    { header: 'Metric', width: 5000 },
    { header: 'Value', width: 4000, align: 'right' },
  ]
  const overviewRows = [
    ['Total professional services', formatCurrency(summary.projectTotalCost, currency)],
    ['Total consultant days', summary.projectTotalDays.toFixed(1)],
    ['Duration', `${summary.durationMonths} months`],
    ['Team size', `${teamSize} roles`],
  ]

  const rolloutCols: TableColumn[] = [
    { header: 'Rollout', width: 5000 },
    { header: 'Days', width: 2000, align: 'right' },
    { header: 'Cost', width: 2000, align: 'right' },
  ]
  const rolloutRows = Array.from(rolloutTotals.values()).map((t) => [
    t.name,
    t.days.toFixed(1),
    formatCurrency(t.cost, currency),
  ])

  const roleCols: TableColumn[] = [
    { header: 'Role', width: 4500 },
    { header: 'Days', width: 2250, align: 'right' },
    { header: 'Cost', width: 2250, align: 'right' },
  ]
  const roleRows = summary.roles
    .filter((r) => r.totalDays > 0)
    .map((r) => [r.roleName, r.totalDays.toFixed(1), formatCurrency(r.totalCost, currency)])

  const rateCols: TableColumn[] = [
    { header: 'Role', width: 6000 },
    { header: 'Day rate', width: 3000, align: 'right' },
  ]
  const rateRows = roleConfigs.map((r) => [r.roleName, formatCurrency(r.rate, currency)])

  const children: (Paragraph | ReturnType<typeof brandedTable>)[] = [
    ...coverParagraphs('Pricing Summary', opportunity.customerName, dateStr, 'v1.0'),
    new Paragraph({ children: [new PageBreak()] }),

    h1('Pricing overview'),
    brandedTable(overviewCols, overviewRows),

    h1('Cost breakdown by rollout'),
    brandedTable(rolloutCols, rolloutRows),

    h1('Cost breakdown by role'),
    brandedTable(roleCols, roleRows),

    h1('Rate card'),
    brandedTable(rateCols, rateRows),
  ]

  if (scope.assumptions.length) children.push(h1('Assumptions'), ...bullets(scope.assumptions))
  if (scope.exclusions.length) children.push(h1('Exclusions'), ...bullets(scope.exclusions))

  children.push(h2('Validity'), p(`This pricing is valid until ${validUntil}.`))

  const doc = brandedDocument(children)
  return Packer.toBuffer(doc)
}
