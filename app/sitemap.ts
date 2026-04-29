import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tradeghost.netlify.app').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: { slug: string; updated_at: string }[] = []
  let pages: { slug: string; updated_at: string }[] = []

  try {
    const supabase = createClient()
    const [{ data: postData }, { data: pageData }] = await Promise.all([
      supabase
        .from('posts')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false }),
      supabase
        .from('pages')
        .select('slug, updated_at')
        .eq('status', 'published'),
    ])
    posts = postData ?? []
    pages = pageData ?? []
  } catch {
    // Supabase unavailable at build time — return static routes only
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                      lastModified: new Date(), changeFrequency: 'hourly', priority: 1   },
    { url: `${BASE_URL}/articles/all-articles`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/articles/popular`,      lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE_URL}/articles/trending`,     lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE_URL}/markets`,               lastModified: new Date(), changeFrequency: 'always', priority: 0.8 },
    { url: `${BASE_URL}/markets/india`,         lastModified: new Date(), changeFrequency: 'always', priority: 0.7 },
    { url: `${BASE_URL}/markets/global`,        lastModified: new Date(), changeFrequency: 'always', priority: 0.7 },
    { url: `${BASE_URL}/markets/crypto`,        lastModified: new Date(), changeFrequency: 'always', priority: 0.7 },
    { url: `${BASE_URL}/markets/forex`,         lastModified: new Date(), changeFrequency: 'always', priority: 0.7 },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/articles/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const pageRoutes: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${BASE_URL}/${page.slug}`,
    lastModified: new Date(page.updated_at),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticRoutes, ...postRoutes, ...pageRoutes]
}
