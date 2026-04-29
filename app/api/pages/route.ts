import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PageSchema } from '@/lib/validations'
import { uniqueSlug } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase.from('pages').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = PageSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

    const serviceClient = createServiceClient()
    const { data: existing } = await serviceClient.from('pages').select('slug')
    const slugList = (existing ?? []).map((r: { slug: string }) => r.slug)
    const slug = uniqueSlug(parsed.data.slug || parsed.data.title, slugList)

    const { data, error } = await serviceClient.from('pages').insert([{ ...parsed.data, slug, content: body.content ?? '' }]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePath('/page/[slug]', 'page')
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
  }
}
