'use client'

import dynamic from 'next/dynamic'
import { useMarketData } from '@/hooks/use-market-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPercentage, cn } from '@/lib/utils'
import type { MarketItem } from '@/lib/types'
import { FALLBACK_GAINERS, FALLBACK_GLOBAL, FALLBACK_LOSERS, getMarketItems } from '@/components/market/market-fallbacks'

const LineChart = dynamic(() => import('@/components/charts/line-chart'), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })
const BarChart = dynamic(() => import('@/components/charts/bar-chart'), { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> })

export default function GlobalMarketsPage() {
  const { data: globalData, isLoading } = useMarketData('indices_global')
  const { data: gainersData } = useMarketData('gainers')
  const { data: losersData } = useMarketData('losers')

  const indices: MarketItem[] = getMarketItems(globalData?.data, FALLBACK_GLOBAL)
  const gainers: MarketItem[] = getMarketItems(gainersData?.data, FALLBACK_GAINERS)
  const losers: MarketItem[] = getMarketItems(losersData?.data, FALLBACK_LOSERS)

  return (
    <main className="flex-1 container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Global Market</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {isLoading
          ? [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 w-full" />)
          : indices.map((item) => (
            <Card key={item.symbol}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{item.name ?? item.symbol}</p>
                <p className="text-xl font-bold mt-1">{item.price != null ? item.price.toFixed(2) : '—'}</p>
                <p className={cn('text-sm font-medium', item.changePercent >= 0 ? 'text-green-500' : 'text-red-500')}>
                  {formatPercentage(item.changePercent)}
                </p>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Card>
        <CardHeader><CardTitle>Index Comparison</CardTitle></CardHeader>
        <CardContent>
          <LineChart items={indices} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-green-600">Top Gainers</CardTitle></CardHeader>
          <CardContent>
            <BarChart items={gainers.slice(0, 10)} color="#22c55e" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-red-500">Top Losers</CardTitle></CardHeader>
          <CardContent>
            <BarChart items={losers.slice(0, 10)} color="#ef4444" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Global Indices — Full Table</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Index</th>
                  <th className="text-right py-2 pr-4">Price</th>
                  <th className="text-right py-2 pr-4">Change %</th>
                </tr>
              </thead>
              <tbody>
                {indices.map((item) => (
                  <tr key={item.symbol} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{item.name ?? item.symbol}</td>
                    <td className="py-2 pr-4 text-right">{item.price != null ? item.price.toFixed(2) : '—'}</td>
                    <td className={cn('py-2 text-right font-medium', item.changePercent >= 0 ? 'text-green-500' : 'text-red-500')}>
                      {formatPercentage(item.changePercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
