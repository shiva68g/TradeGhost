import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) return NextResponse.json({ data: [] })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, slug, excerpt, created_at')
    .eq('status', 'published')
    .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
    .order('views', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
