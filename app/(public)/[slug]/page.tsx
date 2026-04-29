import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PostContent } from '@/components/blog/post-content'
import { MarketSidebar } from '@/components/market/market-sidebar'
import { Badge } from '@/components/ui/badge'

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
    .from('pages')
    .select('title, meta_title, meta_description')
    .eq('slug', params.slug)

  if (!allowDraft) query = query.eq('status', 'published')

  const { data: page } = await query.single()

  if (!page) return { title: 'Page not found' }

  return {
    title: page.meta_title ?? page.title,
    description: page.meta_description ?? undefined,
    openGraph: {
      title: page.meta_title ?? page.title,
      description: page.meta_description ?? undefined,
    },
  }
}

export default async function CmsPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const allowDraft = await canPreviewDraft(searchParams?.preview)
  let query = supabase
    .from('pages')
    .select('*')
    .eq('slug', params.slug)

  if (!allowDraft) query = query.eq('status', 'published')

  const { data: page } = await query.single()

  if (!page) notFound()

  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <article className="space-y-6">
          <header className="space-y-3">
            {page.status !== 'published' && <Badge variant="outline">Draft Preview</Badge>}
            <h1 className="text-3xl font-bold">{page.title}</h1>
          </header>
          <PostContent content={page.content ?? ''} />
        </article>
        <div className="w-full">
          <div className="lg:sticky lg:top-20">
            <MarketSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}
