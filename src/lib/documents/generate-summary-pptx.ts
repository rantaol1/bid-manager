import PptxGenJS from 'pptxgenjs'
import { format } from 'date-fns'
import { titleSlide, contentSlide, addRoadmap, PPTX_BRAND } from '@/lib/documents/pptx-helpers'
import { addSolutionTowerSlide } from '@/lib/documents/slides/shared/solution-tower'
import { formatCurrency } from '@/lib/utils'
import type { DocData } from '@/lib/documents/doc-data'

export async function generateSummaryPptx(data: DocData): Promise<Buffer> {
  const { estimation, summary, scope } = data
  const { opportunity } = estimation
  const currency = opportunity.currency
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'Arcwide Bid Manager'
  const dateStr = format(new Date(), 'd MMMM yyyy')

  // 1. Title
  titleSlide(pptx, 'Executive Summary', opportunity.customerName, dateStr)

  // 2. Opportunity overview
  const overview = contentSlide(pptx, 'Opportunity overview')
  overview.addText(
    [
      { text: 'Customer: ', options: { bold: true } },
      { text: `${opportunity.customerName}\n`, options: {} },
      { text: 'Engagement: ', options: { bold: true } },
      { text: `${opportunity.name}\n`, options: {} },
      { text: 'Modules in scope: ', options: { bold: true } },
      { text: scope.selectedModuleNames.join(', ') || '—', options: {} },
    ],
    { x: 0.5, y: 1.2, w: 9, h: 2, fontFace: 'Arial', fontSize: 16, color: PPTX_BRAND.black, valign: 'top' }
  )

  // 3. Solution approach
  const approach = contentSlide(pptx, 'Solution approach')
  const modulesBullets =
    scope.selectedModuleNames.length > 0
      ? scope.selectedModuleNames.map((m) => ({ text: m, options: { bullet: true, fontFace: 'Arial', fontSize: 14 } }))
      : [{ text: 'Modules to be confirmed during scoping.', options: { fontFace: 'Arial', fontSize: 14 } }]
  approach.addText(modulesBullets, { x: 0.5, y: 1.2, w: 9, h: 3.5, color: PPTX_BRAND.black })

  // 3b. Solution set overview (phased tower) — full-bleed, no title/footer chrome.
  if (scope.selectedModuleNames.length > 0) {
    addSolutionTowerSlide(pptx, scope)
  }

  // 4. Project team
  const team = contentSlide(pptx, 'Project team')
  const activeRoles = summary.roles.filter((r) => r.totalDays > 0)
  team.addText(
    activeRoles.map((r) => ({
      text: `${r.roleName} — ${r.totalDays.toFixed(0)} days`,
      options: { bullet: true, fontFace: 'Arial', fontSize: 14 },
    })),
    { x: 0.5, y: 1.2, w: 9, h: 3.5, color: PPTX_BRAND.black }
  )

  // 5. Timeline
  const timeline = contentSlide(pptx, 'Timeline')
  addRoadmap(pptx, timeline, estimation)

  // 6. Investment summary
  const investment = contentSlide(pptx, 'Investment summary')
  const rolloutTotals = new Map<string, { name: string; cost: number }>()
  for (const ph of summary.phases) {
    const t = rolloutTotals.get(ph.rolloutId) ?? { name: ph.rolloutName, cost: 0 }
    t.cost += ph.totalCost
    rolloutTotals.set(ph.rolloutId, t)
  }
  const header = ['Rollout', 'Investment'].map((t) => ({
    text: t,
    options: { bold: true, color: 'FFFFFF', fill: { color: PPTX_BRAND.magenta }, fontFace: 'Arial' },
  }))
  const rows: PptxGenJS.TableRow[] = Array.from(rolloutTotals.values()).map((t) => [
    { text: t.name, options: { fontFace: 'Arial' } },
    { text: formatCurrency(t.cost, currency), options: { fontFace: 'Arial', align: 'right' } },
  ])
  rows.push([
    { text: 'Total', options: { fontFace: 'Arial', bold: true } },
    { text: formatCurrency(summary.projectTotalCost, currency), options: { fontFace: 'Arial', align: 'right', bold: true } },
  ])
  investment.addTable([header, ...rows], { x: 0.5, y: 1.2, w: 6, fontSize: 14, border: { type: 'solid', color: 'D9D9D9', pt: 0.5 } })

  // 7. Why Arcwide
  const why = contentSlide(pptx, 'Why Arcwide')
  why.addText(
    [
      'IFS Elite Partner with deep implementation expertise',
      'Proven delivery methodology across ERP, EAM and FSM',
      'Senior consultants with industry-specific experience',
      'End-to-end ownership from scoping to go-live and beyond',
    ].map((t) => ({ text: t, options: { bullet: true, fontFace: 'Arial', fontSize: 16 } })),
    { x: 0.5, y: 1.2, w: 9, h: 3.5, color: PPTX_BRAND.black }
  )

  const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  return buf
}
