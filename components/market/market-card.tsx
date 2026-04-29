'use client'

import { useMarketData } from '@/hooks/use-market-data'
import { useSettings } from '@/hooks/use-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { formatPercentage, cn } from '@/lib/utils'
import Link from 'next/link'
import { useRef, useEffect } from 'react'
import type { MarketItem, CryptoItem } from '@/lib/types'
import { FALLBACK_GLOBAL, FALLBACK_GAINERS, FALLBACK_INDIA, FALLBACK_LOSERS, getCryptoItems, getForexRates, getMarketItems } from './market-fallbacks'

function MarketRow({ name, price, changePercent }: { name: string; price: number; changePercent: number }) {
  const isPos = changePercent >= 0
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ minHeight: 36 }}>
      <span className="text-sm font-medium truncate mr-2">{name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm">{typeof price === 'number' && !isNaN(price) ? price.toFixed(2) : '—'}</span>
        <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', isPos ? 'text-green-500' : 'text-red-500')}>
          {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isNaN(changePercent) ? '—' : formatPercentage(changePercent)}
        </span>
      </div>
    </div>
  )
}

// Smooth continuous vertical ticker using requestAnimationFrame
function TickerList({ items, visibleCount = 5 }: { items: React.ReactNode[]; visibleCount?: number }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(0)
  const rafRef = useRef<number>(0)
  const ITEM_H = 36
  const SPEED = 0.35 // px per frame — slow and smooth

  // Duplicate items so the loop is seamless
  const doubled = [...items, ...items]
  const loopHeight = items.length * ITEM_H

  useEffect(() => {
    if (items.length <= visibleCount) return

    function tick() {
      posRef.current += SPEED
      if (posRef.current >= loopHeight) posRef.current = 0
      if (trackRef.current) {
        trackRef.current.style.transform = `translateY(-${posRef.current}px)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [items.length, loopHeight, visibleCount])

  if (items.length <= visibleCount) {
    return <div>{items}</div>
  }

  return (
    <div style={{ height: visibleCount * ITEM_H, overflow: 'hidden' }}>
      <div ref={trackRef} style={{ willChange: 'transform' }}>
        {doubled.map((item, i) => (
          <div key={i}>{item}</div>
        ))}
      </div>
    </div>
  )
}

function ShowMoreLink({ href, override }: { href: string; override?: string }) {
  return (
    <Link
      href={override ?? href}
      className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
    >
      Show more <ChevronRight className="h-3 w-3" />
    </Link>
  )
}

export function IndianMarketCard() {
  const { data, isLoading, isError } = useMarketData('indices_india')
  const { data: settings = {} } = useSettings()
  const items = getMarketItems(data?.data, FALLBACK_INDIA)

  const rows = items.map(item => (
    <MarketRow key={item.symbol} name={item.name || item.symbol} price={item.price} changePercent={item.changePercent} />
  ))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Indian Market</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : isError || items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
        ) : (
          <TickerList items={rows} />
        )}
        <ShowMoreLink href="/markets/india" override={settings.market_india_more_url} />
      </CardContent>
    </Card>
  )
}

export function GlobalMarketCard() {
  const { data, isLoading, isError } = useMarketData('indices_global')
  const { data: settings = {} } = useSettings()
  const items = getMarketItems(data?.data, FALLBACK_GLOBAL)

  const rows = items.map(item => (
    <MarketRow key={item.symbol} name={item.name || item.symbol} price={item.price} changePercent={item.changePercent} />
  ))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Global Market</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : isError || items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
        ) : (
          <TickerList items={rows} />
        )}
        <ShowMoreLink href="/markets/global" override={settings.market_global_more_url} />
      </CardContent>
    </Card>
  )
}

export function TopGainersCard() {
  const { data, isLoading, isError } = useMarketData('gainers')
  const { data: settings = {} } = useSettings()
  const items = getMarketItems(data?.data, FALLBACK_GAINERS)

  const rows = items.map(item => (
    <MarketRow key={item.symbol} name={item.name || item.symbol} price={item.price} changePercent={item.changePercent} />
  ))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-green-600">Top Gainers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : isError || items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
        ) : (
          <TickerList items={rows} />
        )}
        <ShowMoreLink href="/markets/india" override={settings.market_gainers_more_url} />
      </CardContent>
    </Card>
  )
}

export function TopLosersCard() {
  const { data, isLoading, isError } = useMarketData('losers')
  const { data: settings = {} } = useSettings()
  const items = getMarketItems(data?.data, FALLBACK_LOSERS)

  const rows = items.map(item => (
    <MarketRow key={item.symbol} name={item.name || item.symbol} price={item.price} changePercent={item.changePercent} />
  ))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-red-600">Top Losers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : isError || items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
        ) : (
          <TickerList items={rows} />
        )}
        <ShowMoreLink href="/markets/india" override={settings.market_losers_more_url} />
      </CardContent>
    </Card>
  )
}

export function ForexCard() {
  const { data, isLoading, isError } = useMarketData('forex')
  const { data: settings = {} } = useSettings()
  const rates = getForexRates(data?.data)

  const pairs = [
    { name: 'USD/INR', value: rates.INR },
    { name: 'EUR/INR', value: rates.INR && rates.EUR ? rates.INR / rates.EUR : 0 },
    { name: 'GBP/INR', value: rates.INR && rates.GBP ? rates.INR / rates.GBP : 0 },
    { name: 'JPY/INR', value: rates.INR && rates.JPY ? rates.INR / rates.JPY : 0 },
    { name: 'AUD/INR', value: rates.INR && rates.AUD ? rates.INR / rates.AUD : 0 },
    { name: 'CAD/INR', value: rates.INR && rates.CAD ? rates.INR / rates.CAD : 0 },
  ]

  const rows = pairs.map(pair => (
    <div key={pair.name} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ minHeight: 36 }}>
      <span className="text-sm font-medium">{pair.name}</span>
      <span className="text-sm">{pair.value ? pair.value.toFixed(4) : '—'}</span>
    </div>
  ))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Forex</CardTitle>
          <Badge variant="success" className="text-[10px]">Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : isError ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
        ) : (
          <TickerList items={rows} />
        )}
        <ShowMoreLink href="/markets/forex" override={settings.market_forex_more_url} />
      </CardContent>
    </Card>
  )
}

export function CryptoCard() {
  const { data, isLoading, isError } = useMarketData('crypto')
  const { data: settings = {} } = useSettings()
  const items: CryptoItem[] = getCryptoItems(data?.data)

  const rows = items.map(item => (
    <MarketRow key={item.id} name={item.symbol.toUpperCase()} price={item.current_price} changePercent={item.price_change_percentage_24h} />
  ))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Crypto</CardTitle>
          <Badge variant="success" className="text-[10px]">Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-7 w-full" />)}</div>
        ) : isError || items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
        ) : (
          <TickerList items={rows} />
        )}
        <ShowMoreLink href="/markets/crypto" override={settings.market_crypto_more_url} />
      </CardContent>
    </Card>
  )
}
