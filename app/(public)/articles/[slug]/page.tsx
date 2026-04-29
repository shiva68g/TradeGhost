import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PostContent } from '@/components/blog/post-content'
import { MarketSidebar } from '@/components/market/market-sidebar'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import Image from 'next/image'
import { ViewTracker } from '@/components/blog/view-tracker'

export const dynamic = 'force-dynamic'

export const revalidate = 60

interface Props {
  params: { slug: string }
  searchParams?: { preview?: string }
}

async function canPreviewDraft(preview?: string) {
  if (preview !== '1') return false

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const supabase = createClient()
  const allowDraft = await canPreviewDraft(searchParams?.preview)
  let query = supabase
    .from('posts')
    .select('title, excerpt, meta_title, meta_description, cover_image')
    .eq('slug', params.slug)

  if (!allowDraft) query = query.eq('status', 'published')

  const { data: post } = await query.single()

  if (!post) return { title: 'Post not found' }

  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt ?? undefined,
      images: post.cover_image ? [post.cover_image] : [],
      type: 'article',
    },
  }
}

export default async function PostPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const allowDraft = await canPreviewDraft(searchParams?.preview)
  let query = supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)

  if (!allowDraft) query = query.eq('status', 'published')

  const { data: post } = await query.single()

  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image ?? undefined,
    datePublished: post.created_at,
    dateModified: post.updated_at,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {post.status === 'published' && <ViewTracker postId={post.id} />}
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <article className="space-y-6">
            <header>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">{formatDate(post.created_at)}</Badge>
                {post.status !== 'published' && <Badge variant="outline">Draft Preview</Badge>}
                <span className="text-sm text-muted-foreground">{post.views} views</span>
              </div>
              <h1 className="text-3xl font-bold">{post.title}</h1>
              {post.excerpt && <p className="text-lg text-muted-foreground mt-2">{post.excerpt}</p>}
            </header>

            {post.cover_image && (
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={post.cover_image}
                  alt={post.cover_image_alt ?? post.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 70vw"
                />
              </div>
            )}

            <PostContent content={post.content ?? ''} />
          </article>

          <div className="w-full">
            <div className="lg:sticky lg:top-20">
              <MarketSidebar />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
