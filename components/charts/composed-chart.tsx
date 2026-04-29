'use client'

import { ComposedChart as RechartsComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { CryptoItem } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

interface ComposedChartProps {
  items: CryptoItem[]
}

export default function ComposedChart({ items }: ComposedChartProps) {
  if (!items.length) return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data</div>

  const data = items.map((item) => ({
    name: item.symbol.toUpperCase(),
    price: item.current_price,
    volume: item.total_volume,
    change: item.price_change_percentage_24h,
  }))

  return (
    <ResponsiveContainer width="100%" height={256}>
      <RechartsComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="price" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="volume" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip formatter={(value: number, name) => name === 'volume' ? formatNumber(value) : (value != null ? value.toFixed(2) : '—')} />
        <Legend />
        <Bar yAxisId="volume" dataKey="volume" fill="#3b82f6" fillOpacity={0.3} />
        <Line yAxisId="price" type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </RechartsComposedChart>
    </ResponsiveContainer>
  )
}
