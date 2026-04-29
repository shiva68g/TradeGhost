import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { createClient } from '@/lib/supabase/server'
import NextTopLoader from 'nextjs-toploader'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  let settingsMap: Record<string, string> = {}

  try {
    const supabase = createClient()
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['site_name', 'site_description', 'favicon_url', 'default_meta_title', 'default_meta_description', 'default_og_image'])

    settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]))
  } catch {
  }

  const siteName = settingsMap.site_name || 'TradeGhost'
  const description = settingsMap.default_meta_description || settingsMap.site_description || 'Live market data, news and trading dashboard'
  const faviconUrl = settingsMap.favicon_url || '/favicon.ico'

  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description,
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
    openGraph: {
      title: settingsMap.default_meta_title || siteName,
      description,
      images: settingsMap.default_og_image ? [settingsMap.default_og_image] : [],
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
    verification: { google: 'UVBrDZ0oAYLEvC20nOZCFJLeDuYGpeyO6N7xBrggzk0' },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tradeghost.netlify.app'),
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Top progress bar — fires on every link click / route change */}
        <NextTopLoader
          color="#16a34a"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #16a34a, 0 0 5px #16a34a"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
