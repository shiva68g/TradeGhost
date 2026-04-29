import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LoginSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ data: { user: data.user } })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
