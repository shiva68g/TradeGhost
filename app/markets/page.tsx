import Link from 'next/link'
import { IndianMarketCard, GlobalMarketCard, TopGainersCard, TopLosersCard, ForexCard, CryptoCard } from '@/components/market/market-card'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

export const revalidate = 60

const marketLinks = [
  { href: '/markets/india', label: 'Indian Market', desc: 'NIFTY, SENSEX, BANKNIFTY' },
  { href: '/markets/global', label: 'Global Market', desc: 'S&P 500, NASDAQ, FTSE, DAX, Nikkei' },
  { href: '/markets/forex', label: 'Forex', desc: 'USD, EUR, GBP, JPY vs INR' },
  { href: '/markets/crypto', label: 'Crypto', desc: 'Top 20 cryptocurrencies' },
]

export default function MarketsPage() {
  return (
    <main className="flex-1 container py-6">
      <h1 className="text-3xl font-bold mb-6">Markets Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {marketLinks.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IndianMarketCard />
        <GlobalMarketCard />
        <TopGainersCard />
        <TopLosersCard />
        <ForexCard />
        <CryptoCard />
      </div>
    </main>
  )
}
