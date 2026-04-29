'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Trash2, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { Log } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function AdminLogsPage() {
  const [levelFilter, setLevelFilter] = useQueryState('level', { defaultValue: 'all' })
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ logs: Log[]; count: number }>({
    queryKey: ['logs', levelFilter],
    queryFn: async () => {
      let query = supabase.from('logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100)
      if (levelFilter !== 'all') query = query.eq('level', levelFilter)
      const { data, count, error } = await query
      if (error) throw error
      return { logs: (data as Log[]) ?? [], count: count ?? 0 }
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('logs').delete().lt('created_at', new Date().toISOString())
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      toast.success('Logs cleared')
    },
    onError: () => toast.error('Failed to clear logs'),
  })

  const showWarning = (data?.count ?? 0) > 5000

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Logs</h1>
        <div className="flex items-center gap-3">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" />Clear All</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all logs?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all log entries.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearMutation.mutate()} className="bg-destructive text-white">Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {showWarning && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          Log table is large ({data?.count?.toLocaleString()} rows) — consider extending prune window in Settings
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Logs
            <Badge variant="secondary">{data?.count ?? 0} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Timestamp</th>
                    <th className="text-left py-2 pr-4">Level</th>
                    <th className="text-left py-2 pr-4">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.logs ?? []).map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'warning' : 'info'} className="text-[10px]">
                          {log.level}
                        </Badge>
                      </td>
                      <td className="py-2 text-sm max-w-lg truncate">{log.message}</td>
                    </tr>
                  ))}
                  {(data?.logs ?? []).length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No logs</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
