import nextDynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FeaturedPostCard, PostCard } from '@/components/blog/post-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight } from 'lucide-react'
import type { Post } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MarketSidebar = nextDynamic(
  () => import('@/components/market/market-sidebar').then(m => ({ default: m.MarketSidebar })),
  { ssr: false }
)

export const revalidate = 60

const HOME_LIMIT = 6

export default async function HomePage() {
  const supabase = createClient()

  const weekStart = new Date()
  const day = weekStart.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  weekStart.setUTCDate(weekStart.getUTCDate() - diff)
  weekStart.setUTCHours(0, 0, 0, 0)

  const [
    { data: featuredPosts },
    { data: latestPosts },
    { data: popularPosts },
    { data: trendingPosts },
  ] = await Promise.all([
    supabase.from('posts').select('*').eq('status', 'published').order('views', { ascending: false }).limit(1),
    supabase.from('posts').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(HOME_LIMIT),
    supabase.from('posts').select('*').eq('status', 'published').order('views', { ascending: false }).limit(HOME_LIMIT),
    supabase.from('posts').select('*').eq('status', 'published')
      .gte('created_at', weekStart.toISOString())
      .order('views', { ascending: false })
      .limit(HOME_LIMIT),
  ])

  const featured = featuredPosts?.[0] as Post | undefined
  const latest = (latestPosts ?? []) as Post[]
  const popular = (popularPosts ?? []) as Post[]
  const trending = (trendingPosts ?? []) as Post[]

  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-8 min-w-0">
          {featured && <FeaturedPostCard post={featured} />}

          <div>
            <Tabs defaultValue="latest">
              <TabsList className="mb-4">
                <TabsTrigger value="latest">Latest</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="trending">This Week</TabsTrigger>
              </TabsList>

              <TabsContent value="latest">
                <div className="grid sm:grid-cols-2 gap-4">
                  {latest.map((post) => <PostCard key={post.id} post={post} />)}
                  {latest.length === 0 && <p className="col-span-2 text-center py-12 text-muted-foreground">No posts yet.</p>}
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href="/articles/all-articles" className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                    Show more <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="popular">
                <div className="grid sm:grid-cols-2 gap-4">
                  {popular.map((post) => <PostCard key={post.id} post={post} />)}
                  {popular.length === 0 && <p className="col-span-2 text-center py-12 text-muted-foreground">No posts yet.</p>}
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href="/articles/popular" className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                    Show more <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="trending">
                <div className="grid sm:grid-cols-2 gap-4">
                  {trending.map((post) => <PostCard key={post.id} post={post} />)}
                  {trending.length === 0 && <p className="col-span-2 text-center py-12 text-muted-foreground">No trending posts this week yet.</p>}
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href="/articles/trending" className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                    Show more <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="w-full">
          <div className="lg:sticky lg:top-20">
            <MarketSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}
