'use client'

import { useMarketData } from '@/hooks/use-market-data'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatPercentage } from '@/lib/utils'
import { FALLBACK_GLOBAL, FALLBACK_INDIA, getCryptoItems, getForexRates, getMarketItems } from './market-fallbacks'

function TickerItem({
  name,
  price,
  changePercent,
  live,
}: {
  name: string
  price: number
  changePercent: number
  live: boolean
}) {
  const isPos = changePercent >= 0
  const priceDisplay = typeof price === 'number' && !isNaN(price) ? price.toFixed(2) : '—'
  const changeDisplay = isNaN(changePercent) ? '—' : formatPercentage(changePercent)

  return (
    <span className="inline-flex items-center gap-2 px-6 py-1 border-r border-border last:border-r-0">
      <span className="font-semibold text-xs">{name}</span>
      <span className="text-xs">{priceDisplay}</span>
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          isPos ? 'text-green-500' : 'text-red-500'
        }`}
      >
        {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {changeDisplay}
      </span>
      <span
        className={`text-[10px] px-1 rounded ${
          live
            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
            : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
        }`}
      >
        {live ? 'Live' : 'Live'}
      </span>
    </span>
  )
}

export function MarketTicker() {
  const { data: indiaData } = useMarketData('indices_india')
  const { data: globalData } = useMarketData('indices_global')
  const { data: cryptoData } = useMarketData('crypto')
  const { data: forexData } = useMarketData('forex')

  const indiaItems = getMarketItems(indiaData?.data, FALLBACK_INDIA)
  const globalItems = getMarketItems(globalData?.data, FALLBACK_GLOBAL)
  const cryptoItems = getCryptoItems(cryptoData?.data).slice(0, 5)
  const forexRates = getForexRates(forexData?.data)
  const liveForex = ['INR', 'EUR', 'GBP', 'JPY'].map((currency) => ({
    name: `USD/${currency}`,
    price: forexRates[currency] ?? NaN,
    changePercent: 0,
    live: true,
  }))

  const allItems = [
    ...indiaItems.map(item => ({ name: item.name || item.symbol, price: item.price, changePercent: item.changePercent, live: false })),
    ...globalItems.map(item => ({ name: item.name || item.symbol, price: item.price, changePercent: item.changePercent, live: false })),
    ...cryptoItems.map(item => ({ name: item.symbol.toUpperCase(), price: item.current_price, changePercent: item.price_change_percentage_24h, live: true })),
    ...liveForex,
  ]

  return (
    <div className="ticker-wrap bg-muted/50 border-b h-8 flex items-center overflow-hidden">
      <div className="ticker-content">
        {allItems.map((item, idx) => (
          <TickerItem
            key={`${item.name}-${idx}`}
            name={item.name}
            price={item.price}
            changePercent={item.changePercent}
            live={item.live}
          />
        ))}
        {/* Duplicate for seamless loop */}
        {allItems.map((item, idx) => (
          <TickerItem
            key={`dup-${item.name}-${idx}`}
            name={item.name}
            price={item.price}
            changePercent={item.changePercent}
            live={item.live}
          />
        ))}
      </div>
    </div>
  )
}
