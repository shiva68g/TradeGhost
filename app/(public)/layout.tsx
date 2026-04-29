import dynamic from 'next/dynamic'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

const MarketTicker = dynamic(
  () => import('@/components/market/ticker').then(m => ({ default: m.MarketTicker })),
  { ssr: false }
)

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <MarketTicker />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
