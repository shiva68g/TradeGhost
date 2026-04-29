'use client'

import dynamic from 'next/dynamic'
import { useMarketData } from '@/hooks/use-market-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getForexRates } from '@/components/market/market-fallbacks'

const AreaChart = dynamic(() => import('@/components/charts/area-chart'), { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> })

const PAIRS = [
  { label: 'USD/INR', key: 'INR' },
  { label: 'EUR/USD', key: 'EUR' },
  { label: 'GBP/USD', key: 'GBP' },
  { label: 'USD/JPY', key: 'JPY' },
  { label: 'AUD/USD', key: 'AUD' },
  { label: 'CAD/USD', key: 'CAD' },
]

export default function ForexPage() {
  const { data: forexData, isLoading } = useMarketData('forex')
  const rates = getForexRates(forexData?.data)

  return (
    <main className="flex-1 container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Forex</h1>
        <Badge variant="success">Live via ExchangeRate-API</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {isLoading
          ? [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 w-full" />)
          : PAIRS.map((pair) => (
            <Card key={pair.label}>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground">{pair.label}</p>
                <p className="text-2xl font-bold mt-1">{rates[pair.key]?.toFixed(4) ?? '—'}</p>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Card>
        <CardHeader><CardTitle>USD/INR Rate History</CardTitle></CardHeader>
        <CardContent>
          <AreaChart dataKey="rate" />
        </CardContent>
      </Card>
    </main>
  )
}
