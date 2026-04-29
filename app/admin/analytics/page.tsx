'use client'

import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Post } from '@/lib/types'

const SimpleLineChart = dynamic(() => import('@/components/charts/recharts-line'), { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> })

export default function AdminAnalyticsPage() {
  const [from] = useQueryState('from', { defaultValue: '' })
  const [to] = useQueryState('to', { defaultValue: '' })

  const { data: topPosts, isLoading } = useQuery<Post[]>({
    queryKey: ['analytics-top'],
    queryFn: async () => {
      const res = await fetch('/api/posts?tab=popular&limit=10')
      if (!res.ok) throw new Error('Failed')
      const { posts } = await res.json()
      return posts ?? []
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })

  const chartData = (topPosts ?? []).map((post) => ({
    name: post.title.slice(0, 15) + '...',
    value: post.views,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Top Posts by Views (Daily)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-48 w-full" /> : <SimpleLineChart data={chartData} height={200} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 Posts</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Title</th>
                    <th className="text-right py-2 pr-4">Views</th>
                    <th className="text-right py-2">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {(topPosts ?? []).map((post, idx) => (
                    <tr key={post.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 pr-4 font-medium max-w-xs truncate">{post.title}</td>
                      <td className="py-2 pr-4 text-right font-bold">{post.views}</td>
                      <td className="py-2 text-right text-muted-foreground">{formatDate(post.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
