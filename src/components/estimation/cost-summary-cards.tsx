'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { EstimationSummary } from '@/types'

export function CostSummaryCards({ summary }: { summary: EstimationSummary }) {
  const { currency } = summary
  const stats = [
    { label: 'Total cost', value: formatCurrency(summary.projectTotalCost, currency) },
    { label: 'Total days', value: summary.projectTotalDays.toFixed(1) },
    { label: 'Duration', value: `${summary.durationMonths} mo` },
    { label: 'Avg. utilisation', value: formatPercent(summary.averageUtilisation) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by phase</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.phases.map((p) => (
                  <TableRow key={p.phaseId}>
                    <TableCell>
                      <span className="text-muted-foreground">{p.rolloutName} · </span>
                      {p.phaseName}
                    </TableCell>
                    <TableCell className="text-right">{p.totalDays.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.totalCost, currency)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{summary.projectTotalDays.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.projectTotalCost, currency)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by role</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.roles
                  .filter((r) => r.totalDays > 0)
                  .map((r) => (
                    <TableRow key={r.roleConfigId}>
                      <TableCell>{r.roleName}</TableCell>
                      <TableCell className="text-right">{r.totalDays.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.totalCost, currency)}</TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{summary.projectTotalDays.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.projectTotalCost, currency)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
