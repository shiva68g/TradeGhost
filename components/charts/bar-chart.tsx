'use client'

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { MarketItem } from '@/lib/types'

interface BarChartProps {
  items: MarketItem[]
  color?: string
}

export default function BarChart({ items, color = '#3b82f6' }: BarChartProps) {
  if (!items.length) return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data</div>

  const data = items.map((item) => ({
    name: item.symbol,
    value: Math.abs(item.changePercent),
    changePercent: item.changePercent,
  }))

  return (
    <ResponsiveContainer width="100%" height={192}>
      <RechartsBarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
        <Tooltip formatter={(value: number, name, props) => [props.payload?.changePercent != null ? `${props.payload.changePercent.toFixed(2)}%` : '—', 'Change']} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
