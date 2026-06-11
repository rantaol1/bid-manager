'use client'

import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartEmpty } from '@/components/analysis/chart-empty'
import { CHART_PALETTE } from '@/lib/constants/analysis'
import { formatCurrency } from '@/lib/utils'
import type { MixSlice } from '@/types'

const abbreviate = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)

/** Horizontal bar chart of fees by role, sorted descending. */
export function RoleMixChart({ data, currency }: { data: MixSlice[]; currency: string }) {
  if (data.length === 0) return <ChartEmpty message="No allocations yet" />
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 34)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <XAxis
          type="number"
          tickFormatter={abbreviate}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          formatter={(value) => [formatCurrency(Number(value), currency), 'Fees'] as [string, string]}
        />
        <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.id} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Donut chart of fees by workstream/rollout, using each rollout's colour. */
export function RolloutMixChart({ data, currency }: { data: MixSlice[]; currency: string }) {
  if (data.length === 0) return <ChartEmpty message="No workstreams yet" height={260} />
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="cost" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry, i) => (
            <Cell key={entry.id} fill={entry.colour ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [formatCurrency(Number(value), currency), 'Fees'] as [string, string]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
