'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SeoSchema, type SeoInput } from '@/lib/validations'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Post, Page } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function AdminSeoPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed')
      const { data } = await res.json()
      return data ?? {}
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })

  const { data: sitemapData } = useQuery<{ posts: Post[]; pages: Page[] }>({
    queryKey: ['sitemap-preview'],
    queryFn: async () => {
      const [{ data: posts }, { data: pages }] = await Promise.all([
        supabase.from('posts').select('slug, title, updated_at').eq('status', 'published').order('updated_at', { ascending: false }).limit(20),
        supabase.from('pages').select('slug, title, updated_at').eq('status', 'published'),
      ])
      return { posts: (posts ?? []) as Post[], pages: (pages ?? []) as Page[] }
    },
    staleTime: 60_000,
    refetchInterval: false,
  })

  const form = useForm<SeoInput>({
    resolver: zodResolver(SeoSchema),
    defaultValues: { default_meta_title: '', default_meta_description: '', default_og_image: '', robots_txt: 'User-agent: *\nAllow: /' },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        default_meta_title: settings.default_meta_title ?? '',
        default_meta_description: settings.default_meta_description ?? '',
        default_og_image: settings.default_og_image ?? '',
        robots_txt: settings.robots_txt ?? 'User-agent: *\nAllow: /',
      })
    }
  }, [settings, form])

  const saveMutation = useMutation({
    mutationFn: async (values: SeoInput) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('SEO settings saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">SEO Settings</h1>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Global Defaults</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Meta Title <span className="text-muted-foreground text-xs">(max 70 chars)</span></Label>
                <Input {...form.register('default_meta_title')} maxLength={70} />
              </div>
              <div className="space-y-2">
                <Label>Default Meta Description <span className="text-muted-foreground text-xs">(max 160 chars)</span></Label>
                <Input {...form.register('default_meta_description')} maxLength={160} />
              </div>
              <div className="space-y-2">
                <Label>Default OG Image URL</Label>
                <Input {...form.register('default_og_image')} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Robots.txt</CardTitle></CardHeader>
            <CardContent>
              <textarea
                {...form.register('robots_txt')}
                className="w-full h-32 font-mono text-sm border rounded-md p-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save SEO Settings'}
          </Button>
        </form>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Sitemap Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Published URLs:</p>
            {[
              { url: '/', lastmod: new Date().toISOString() },
              { url: '/posts', lastmod: new Date().toISOString() },
              { url: '/markets', lastmod: new Date().toISOString() },
              ...(sitemapData?.posts ?? []).map(p => ({ url: `/articles/${p.slug}`, lastmod: p.updated_at })),
              ...(sitemapData?.pages ?? []).map(p => ({ url: `/page/${p.slug}`, lastmod: p.updated_at })),
            ].map(({ url, lastmod }) => (
              <div key={url} className="flex justify-between text-xs py-1 border-b last:border-0">
                <span>{url}</span>
                <span className="text-muted-foreground">{new Date(lastmod).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
