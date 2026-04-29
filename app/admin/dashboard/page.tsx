import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Eye, File, AlertCircle } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import nextDynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

const SimpleBarChart = nextDynamic(() => import('@/components/charts/recharts-bar'), { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> })

export default async function AdminDashboard() {
  const supabase = createClient()

  const [
    { count: postCount },
    { count: pageCount },
    { data: topPosts },
    { data: recentLogs },
    { data: analytics },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('pages').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('posts').select('id, title, views').order('views', { ascending: false }).limit(5),
    supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('posts').select('views').eq('status', 'published'),
  ])

  const totalViews = (analytics ?? []).reduce((sum, p) => sum + (p.views ?? 0), 0)

  const chartData = (topPosts ?? []).map((p) => ({
    name: p.title.slice(0, 20) + (p.title.length > 20 ? '...' : ''),
    value: p.views,
  }))

  const statCards = [
    { label: 'Published Posts', value: postCount ?? 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Published Pages', value: pageCount ?? 0, icon: File, color: 'text-purple-500' },
    { label: 'Total Views', value: formatNumber(totalViews), icon: Eye, color: 'text-green-500' },
    { label: 'Recent Errors', value: (recentLogs ?? []).filter(l => l.level === 'error').length, icon: AlertCircle, color: 'text-red-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${card.color}`} />
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 Posts by Views</CardTitle></CardHeader>
          <CardContent>
            <SimpleBarChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Logs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recentLogs ?? []).map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${
                    log.level === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    log.level === 'warn' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>{log.level}</span>
                  <span className="text-muted-foreground flex-1 truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
