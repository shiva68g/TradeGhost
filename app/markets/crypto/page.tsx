'use client'

import dynamic from 'next/dynamic'
import { useMarketData } from '@/hooks/use-market-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPercentage, formatNumber, cn } from '@/lib/utils'
import type { CryptoItem } from '@/lib/types'
import Image from 'next/image'
import { getCryptoItems } from '@/components/market/market-fallbacks'

const ComposedChart = dynamic(() => import('@/components/charts/composed-chart'), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })

export default function CryptoPage() {
  const { data: cryptoData, isLoading } = useMarketData('crypto')
  const items: CryptoItem[] = getCryptoItems(cryptoData?.data)

  return (
    <main className="flex-1 container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Crypto Markets</h1>
        <Badge variant="success">Live via CoinGecko</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Price + Volume Overview</CardTitle></CardHeader>
        <CardContent>
          <ComposedChart items={items.slice(0, 10)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top 20 Cryptocurrencies</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-right py-2 pr-4">Price</th>
                    <th className="text-right py-2 pr-4">24h %</th>
                    <th className="text-right py-2 pr-4">Volume</th>
                    <th className="text-right py-2">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          {item.image && <Image src={item.image} alt={item.name} width={24} height={24} className="rounded-full" />}
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground text-xs">{item.symbol.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">${item.current_price != null ? item.current_price.toFixed(2) : '—'}</td>
                      <td className={cn('py-2 pr-4 text-right font-medium', item.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500')}>
                        {formatPercentage(item.price_change_percentage_24h)}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">${formatNumber(item.total_volume)}</td>
                      <td className="py-2 text-right text-muted-foreground">${formatNumber(item.market_cap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
