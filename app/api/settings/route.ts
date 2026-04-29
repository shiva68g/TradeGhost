import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase.from('settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = Object.fromEntries((data ?? []).map((s: { key: string; value: string }) => [s.key, s.value]))
  return NextResponse.json({ data: map })
}

export async function PUT(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const serviceClient = createServiceClient()

  const upserts = Object.entries(body)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => ({ key, value: String(value) }))

  const { error } = await serviceClient.from('settings').upsert(upserts, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true })
}
