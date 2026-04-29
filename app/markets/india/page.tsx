'use client'

import dynamic from 'next/dynamic'
import { useMarketData } from '@/hooks/use-market-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPercentage, cn } from '@/lib/utils'
import type { MarketItem } from '@/lib/types'
import { FALLBACK_INDIA, getMarketItems } from '@/components/market/market-fallbacks'

const AreaChart = dynamic(() => import('@/components/charts/area-chart'), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })
const BarChart  = dynamic(() => import('@/components/charts/bar-chart'),  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> })

export default function IndiaMarketsPage() {
  const { data: indiaData,   isLoading }  = useMarketData('indices_india')
  const { data: gainersData, isStale: gStale } = useMarketData('gainers')
  const { data: losersData,  isStale: lStale } = useMarketData('losers')
  const { data: nifty50Data, isStale: nStale } = useMarketData('nifty50_stocks')

  const indices: MarketItem[] = getMarketItems(indiaData?.data, FALLBACK_INDIA)

  // Gainers / Losers — live from Supabase, no static fallback
  const gainers: MarketItem[] = Array.isArray(gainersData?.data) ? gainersData.data as MarketItem[] : []
  const losers:  MarketItem[] = Array.isArray(losersData?.data)  ? losersData.data  as MarketItem[] : []

  // Full table — all 50 Nifty stocks live from Supabase, fallback to gainers+losers merged if not yet populated
  const nifty50: MarketItem[] = Array.isArray(nifty50Data?.data) && (nifty50Data.data as MarketItem[]).length > 0
    ? nifty50Data.data as MarketItem[]
    : [...gainers, ...losers]

  const dataStale = gStale || lStale || nStale

  return (
    <main className="flex-1 container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indian Market</h1>
        {dataStale && (
          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
            Showing last known data
          </span>
        )}
      </div>

      {/* Indices */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading
          ? [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)
          : indices.map((item) => (
            <Card key={item.symbol}>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground">{item.name ?? item.symbol}</p>
                <p className="text-2xl font-bold mt-1">{item.price != null ? item.price.toFixed(2) : '—'}</p>
                <p className={cn('text-sm font-medium', item.changePercent >= 0 ? 'text-green-500' : 'text-red-500')}>
                  {formatPercentage(item.changePercent)}
                </p>
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* Intraday chart */}
      <Card>
        <CardHeader><CardTitle>NIFTY 50 — Intraday</CardTitle></CardHeader>
        <CardContent>
          <AreaChart dataKey="price" />
        </CardContent>
      </Card>

      {/* Gainers / Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card id="gainers">
          <CardHeader>
            <CardTitle className="text-green-600">
              Top Gainers
              {gainers.length === 0 && <span className="text-xs font-normal text-muted-foreground ml-2">Loading…</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gainers.length > 0
              ? <BarChart items={gainers.slice(0, 10)} color="#22c55e" />
              : <Skeleton className="h-48 w-full" />
            }
          </CardContent>
        </Card>

        <Card id="losers">
          <CardHeader>
            <CardTitle className="text-red-500">
              Top Losers
              {losers.length === 0 && <span className="text-xs font-normal text-muted-foreground ml-2">Loading…</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {losers.length > 0
              ? <BarChart items={losers.slice(0, 10)} color="#ef4444" />
              : <Skeleton className="h-48 w-full" />
            }
          </CardContent>
        </Card>
      </div>

      {/* Full Nifty 50 Table — all 50 live stocks */}
      <Card>
        <CardHeader>
          <CardTitle>
            NIFTY 50 — Full Table
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {nifty50.length > 0 ? `${nifty50.length} stocks` : 'Loading…'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nifty50.length === 0
            ? <Skeleton className="h-64 w-full" />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4">Symbol</th>
                      <th className="text-left py-2 pr-4 hidden sm:table-cell">Name</th>
                      <th className="text-right py-2 pr-4">Price</th>
                      <th className="text-right py-2 pr-4">Change</th>
                      <th className="text-right py-2">Change %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nifty50.map((item) => (
                      <tr key={item.symbol} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-4 font-medium font-mono text-xs">{item.symbol}</td>
                        <td className="py-2 pr-4 text-muted-foreground hidden sm:table-cell truncate max-w-[160px]">{item.name}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {item.price != null ? item.price.toFixed(2) : '—'}
                        </td>
                        <td className={cn('py-2 pr-4 text-right tabular-nums', item.change >= 0 ? 'text-green-500' : 'text-red-500')}>
                          {item.change != null ? (item.change >= 0 ? '+' : '') + item.change.toFixed(2) : '—'}
                        </td>
                        <td className={cn('py-2 text-right font-medium tabular-nums', item.changePercent >= 0 ? 'text-green-500' : 'text-red-500')}>
                          {formatPercentage(item.changePercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </CardContent>
      </Card>
    </main>
  )
}
