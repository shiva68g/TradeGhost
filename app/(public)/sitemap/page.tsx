import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['site_name', 'site_description'])
  const map = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  const siteName = map.site_name ?? 'TradeGhost'
  return {
    title: `Sitemap — ${siteName}`,
    description: `All pages and posts on ${siteName}`,
  }
}

export default async function SitemapPage() {
  const supabase = createClient()

  const [
    { data: settings },
    { data: posts },
    { data: pages },
  ] = await Promise.all([
    supabase.from('settings').select('key, value').in('key', ['site_name', 'site_description']),
    supabase
      .from('posts')
      .select('title, slug, excerpt, meta_description, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false }),
    supabase
      .from('pages')
      .select('title, slug, meta_description, updated_at')
      .eq('status', 'published')
      .order('title'),
  ])

  const map = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  const siteName = map.site_name ?? 'TradeGhost'
  const siteDescription = map.site_description ?? ''

  return (
    <div className="container py-10 max-w-4xl space-y-10">

      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold mb-1">{siteName}</h1>
        {siteDescription && <p className="text-muted-foreground text-base">{siteDescription}</p>}
        <p className="text-xs text-muted-foreground mt-3">
          Full site index — {(posts ?? []).length} post{(posts ?? []).length !== 1 ? 's' : ''},{' '}
          {(pages ?? []).length} page{(pages ?? []).length !== 1 ? 's' : ''}
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Posts</h2>
        {(posts ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No published posts yet.</p>
        ) : (
          <ul className="space-y-4">
            {(posts ?? []).map(post => {
              const desc = post.meta_description || post.excerpt || ''
              return (
                <li key={post.slug} className="border-b pb-4 last:border-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-0.5 flex-1">
                      <Link
                        href={`/articles/${post.slug}`}
                        className="font-medium hover:underline text-foreground"
                      >
                        {post.title}
                      </Link>
                      {desc && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{desc}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                      {formatDate(post.updated_at)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Pages</h2>
        {(pages ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No published pages yet.</p>
        ) : (
          <ul className="space-y-4">
            {(pages ?? []).map(page => (
              <li key={page.slug} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5 flex-1">
                    <Link
                      href={`/${page.slug}`}
                      className="font-medium hover:underline text-foreground"
                    >
                      {page.title}
                    </Link>
                    {page.meta_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{page.meta_description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {formatDate(page.updated_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}
