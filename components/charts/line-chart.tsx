'use client'

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { MarketItem } from '@/lib/types'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface LineChartProps {
  items: MarketItem[]
}

export default function LineChart({ items }: LineChartProps) {
  if (!items.length) return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data</div>

  const data = [{ name: 'Current', ...Object.fromEntries(items.map(i => [i.symbol, i.price])) }]

  return (
    <ResponsiveContainer width="100%" height={256}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {items.map((item, idx) => (
          <Line key={item.symbol} type="monotone" dataKey={item.symbol} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
