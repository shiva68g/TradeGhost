import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PostSchema } from '@/lib/validations'
import { uniqueSlug } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

const PAGE_LIMIT = 20

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tab = searchParams.get('tab') ?? 'latest'
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_LIMIT)), 50)
    const q = searchParams.get('q')
    const includeAll = searchParams.get('includeAll') === 'true'

    const supabase = createClient()

    let isAuthed = false
    if (includeAll) {
      const { data: { user } } = await supabase.auth.getUser()
      isAuthed = !!user
    }

    // This week: Monday 00:00 UTC of the current week
    const weekStart = new Date()
    const day = weekStart.getUTCDay()
    const diff = day === 0 ? 6 : day - 1
    weekStart.setUTCDate(weekStart.getUTCDate() - diff)
    weekStart.setUTCHours(0, 0, 0, 0)

    // Build count query
    let countQuery = supabase.from('posts').select('*', { count: 'exact', head: true })
    if (!isAuthed) countQuery = countQuery.eq('status', 'published')
    if (q) countQuery = countQuery.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
    if (tab === 'trending') countQuery = countQuery.gte('created_at', weekStart.toISOString())

    const { count } = await countQuery
    const total = count ?? 0

    // Build data query
    let query = supabase.from('posts').select('*')
    if (!isAuthed) query = query.eq('status', 'published')
    if (q) query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)

    const offset = (page - 1) * limit

    if (tab === 'popular') {
      query = query.order('views', { ascending: false }).range(offset, offset + limit - 1)
      const { data, error } = await query
      if (error) throw error
      const posts = data ?? []
      return NextResponse.json({ posts, nextCursor: null, hasMore: offset + posts.length < total, page, total })
    }

    if (tab === 'trending') {
      query = query
        .gte('created_at', weekStart.toISOString())
        .order('views', { ascending: false })
        .range(offset, offset + limit - 1)
      const { data, error } = await query
      if (error) throw error
      const posts = data ?? []
      return NextResponse.json({ posts, nextCursor: null, hasMore: offset + posts.length < total, page, total })
    }

    // Default: latest — offset-based pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    const { data, error } = await query
    if (error) throw error
    const posts = data ?? []
    return NextResponse.json({ posts, nextCursor: null, hasMore: offset + posts.length < total, page, total })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const serviceClient = createServiceClient()
    const { data: existingSlugs } = await serviceClient.from('posts').select('slug')
    const slugList = (existingSlugs ?? []).map((r: { slug: string }) => r.slug)
    const slug = parsed.data.slug || uniqueSlug(parsed.data.title, slugList)

    const { data, error } = await serviceClient.from('posts').insert([{ ...parsed.data, slug, content: body.content ?? '' }]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (parsed.data.status === 'published') revalidatePath('/post/[slug]', 'page')
    revalidatePath('/')

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
