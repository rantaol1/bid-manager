'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartEmpty } from '@/components/analysis/chart-empty'
import { CHART_COLORS } from '@/lib/constants/analysis'
import type { StaffingBucket } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'YYYY-MM' -> "Jun '26". */
function monthLabel(value: string): string {
  const [year, month] = value.split('-')
  const name = MONTHS[Number(month) - 1] ?? value
  return `${name} '${year.slice(2)}`
}

/** Resource histogram: average concurrent FTE per month, with a peak reference line. */
export function StaffingChart({ data, peakFte }: { data: StaffingBucket[]; peakFte: number }) {
  if (data.length === 0) return <ChartEmpty message="No phases scheduled" height={280} />
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={32} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          labelFormatter={(label) => monthLabel(String(label))}
          formatter={(value, _name, item) => {
            const datum = item?.payload as StaffingBucket | undefined
            const personDays = datum ? datum.personDays.toFixed(1) : '0'
            return [`${Number(value).toFixed(1)} FTE · ${personDays} person-days`, 'Staffing'] as [
              string,
              string,
            ]
          }}
        />
        {peakFte > 0 && (
          <ReferenceLine
            y={peakFte}
            stroke={CHART_COLORS.peakLine}
            strokeDasharray="4 4"
            label={{
              value: `Peak ${peakFte.toFixed(1)}`,
              fontSize: 11,
              fill: CHART_COLORS.peakLine,
              position: 'insideTopRight',
            }}
          />
        )}
        <Bar dataKey="fte" fill={CHART_COLORS.staffingBar} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
