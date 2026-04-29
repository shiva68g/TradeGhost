import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json()
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    const supabase = createServiceClient()
    await supabase.rpc('increment_post_views', { post_id: postId })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
  }
}
