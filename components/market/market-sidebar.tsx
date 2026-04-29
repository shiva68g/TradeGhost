import { IndianMarketCard, GlobalMarketCard, TopGainersCard, TopLosersCard, ForexCard, CryptoCard } from './market-card'

export function MarketSidebar() {
  return (
    <aside className="space-y-4 w-full">
      <IndianMarketCard />
      <GlobalMarketCard />
      <TopGainersCard />
      <TopLosersCard />
      <ForexCard />
      <CryptoCard />
    </aside>
  )
}
