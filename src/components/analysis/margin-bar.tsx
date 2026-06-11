'use client'

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartEmpty } from '@/components/analysis/chart-empty'
import { CHART_COLORS } from '@/lib/constants/analysis'
import { formatCurrency } from '@/lib/utils'

const abbreviate = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)

/**
 * Margin composition: a single stacked bar showing how the delivery cost and gross
 * margin make up the total fees. A negative margin is clamped to 0 in the bar (the
 * KPI card reports the negative figure).
 */
export function MarginBar({
  fees,
  deliveryCost,
  grossMargin,
  currency,
}: {
  fees: number
  deliveryCost: number
  grossMargin: number
  currency: string
}) {
  if (fees <= 0) return <ChartEmpty message="No fees yet" height={140} />
  const data = [{ name: 'Fees', cost: deliveryCost, margin: Math.max(0, grossMargin) }]
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <XAxis
          type="number"
          tickFormatter={abbreviate}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          formatter={(value, name) =>
            [formatCurrency(Number(value), currency), name === 'cost' ? 'Delivery cost' : 'Gross margin'] as [
              string,
              string,
            ]
          }
        />
        <Legend />
        <Bar dataKey="cost" name="Delivery cost" stackId="x" fill={CHART_COLORS.marginCost} radius={[4, 0, 0, 4]} />
        <Bar dataKey="margin" name="Gross margin" stackId="x" fill={CHART_COLORS.marginMargin} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
