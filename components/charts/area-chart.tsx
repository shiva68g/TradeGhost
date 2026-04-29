'use client'

import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PLACEHOLDER_DATA = Array.from({ length: 30 }, (_, i) => ({
  name: `T-${30 - i}`,
  price: 22000 + Math.random() * 1000,
  rate: 83 + Math.random() * 2,
}))

interface AreaChartProps {
  data?: Array<Record<string, unknown>>
  dataKey: string
}

export default function AreaChart({ data = PLACEHOLDER_DATA, dataKey }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={256}>
      <RechartsAreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Area type="monotone" dataKey={dataKey} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
