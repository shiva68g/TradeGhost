import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { MarketTicker } from '@/components/market/ticker'

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <MarketTicker />
      {children}
      <Footer />
    </div>
  )
}
