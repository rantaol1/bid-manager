import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api'
import { loadEstimation } from '@/lib/estimation-data'
import { computeEstimation, daysForAllocation } from '@/lib/estimation'

type Params = { params: Promise<{ id: string }> }

const MAGENTA = 'FFE6007E'
const GREY = 'FFF2F2F2'

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const data = await loadEstimation(id)
    if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

    const summary = computeEstimation({
      roleConfigs: data.roleConfigs,
      rollouts: data.rollouts,
      currency: data.opportunity.currency,
    })

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Arcwide Bid Manager'

    const headerStyle = (cell: ExcelJS.Cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAGENTA } }
    }

    // --- Summary sheet ---
    const summarySheet = wb.addWorksheet('Summary')
    summarySheet.columns = [{ width: 30 }, { width: 24 }]
    summarySheet.addRow(['Opportunity', data.opportunity.name])
    summarySheet.addRow(['Customer', data.opportunity.customerName])
    summarySheet.addRow(['Total days', Number(summary.projectTotalDays.toFixed(1))])
    summarySheet.addRow(['Total cost', summary.projectTotalCost])
    summarySheet.addRow(['Duration (months)', summary.durationMonths])
    summarySheet.addRow(['Average utilisation (%)', Number(summary.averageUtilisation.toFixed(1))])
    summarySheet.getColumn(1).font = { bold: true, name: 'Arial' }
    summarySheet.getCell('B4').numFmt = '#,##0'

    // --- Phases sheet ---
    const phasesSheet = wb.addWorksheet('Phases')
    phasesSheet.columns = [
      { header: 'Rollout', key: 'rollout', width: 24 },
      { header: 'Phase', key: 'phase', width: 24 },
      { header: 'Working days', key: 'wd', width: 14 },
      { header: 'Total days', key: 'days', width: 14 },
      { header: 'Total cost', key: 'cost', width: 16 },
    ]
    phasesSheet.getRow(1).eachCell(headerStyle)
    for (const p of summary.phases) {
      const row = phasesSheet.addRow({
        rollout: p.rolloutName,
        phase: p.phaseName,
        wd: p.workingDays,
        days: Number(p.totalDays.toFixed(1)),
        cost: p.totalCost,
      })
      row.getCell('cost').numFmt = '#,##0'
    }

    // --- Roles sheet ---
    const rolesSheet = wb.addWorksheet('Roles')
    rolesSheet.columns = [
      { header: 'Role', key: 'role', width: 30 },
      { header: 'Rate', key: 'rate', width: 12 },
      { header: 'Total days', key: 'days', width: 14 },
      { header: 'Total cost', key: 'cost', width: 16 },
    ]
    rolesSheet.getRow(1).eachCell(headerStyle)
    for (const r of summary.roles) {
      const row = rolesSheet.addRow({
        role: r.roleName,
        rate: r.rate,
        days: Number(r.totalDays.toFixed(1)),
        cost: r.totalCost,
      })
      row.getCell('rate').numFmt = '#,##0'
      row.getCell('cost').numFmt = '#,##0'
    }
    const totalRow = rolesSheet.addRow({
      role: 'TOTAL',
      days: Number(summary.projectTotalDays.toFixed(1)),
      cost: summary.projectTotalCost,
    })
    totalRow.font = { bold: true, name: 'Arial' }
    totalRow.getCell('cost').numFmt = '#,##0'

    // --- Allocation matrix sheet ---
    const matrixSheet = wb.addWorksheet('Allocation matrix')
    const roleHeaders = data.roleConfigs.map((r) => r.roleName)
    matrixSheet.columns = [
      { header: 'Phase', width: 26 },
      ...roleHeaders.map(() => ({ width: 16 })),
      { header: 'Total days', width: 14 },
    ]
    const headerRow = matrixSheet.addRow(['Phase', ...roleHeaders, 'Total days'])
    headerRow.eachCell(headerStyle)

    const allPhases = data.rollouts.flatMap((ro) => ro.phases)
    for (const phase of allPhases) {
      const allocByRole = new Map(phase.allocations.map((a) => [a.roleConfigId, a.percentage]))
      let phaseDays = 0
      const cells = data.roleConfigs.map((rc) => {
        const pct = allocByRole.get(rc.id) ?? 0
        phaseDays += daysForAllocation(pct, phase.workingDays)
        return pct > 0 ? pct / 100 : null
      })
      const row = matrixSheet.addRow([phase.name, ...cells, Number(phaseDays.toFixed(1))])
      for (let i = 0; i < roleHeaders.length; i++) {
        const cell = row.getCell(i + 2)
        cell.numFmt = '0%'
      }
    }
    matrixSheet.getColumn(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } }

    const buffer = await wb.xlsx.writeBuffer()
    const safeName = data.opportunity.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeName}-estimate.xlsx"`,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/opportunities/[id]/export/xlsx')
  }
}
