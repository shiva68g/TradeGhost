import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('settings').select('key').limit(1)
    return NextResponse.json({
      status: 'ok',
      db: error ? 'error' : 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ status: 'error', db: 'disconnected' }, { status: 503 })
  }
}
