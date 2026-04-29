import { NextRequest, NextResponse } from 'next/server' //nav route
import { createClient, createServiceClient } from '@/lib/supabase/server'

function topoSort(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const idSet = new Set(items.map(i => i.id as string))
  const added = new Set<string>()
  const result: Record<string, unknown>[] = []

  function add(item: Record<string, unknown>) {
    const id = item.id as string
    if (added.has(id)) return
    const parentId = item.parent_id as string | null
    if (parentId && idSet.has(parentId) && !added.has(parentId)) {
      const parent = items.find(i => i.id === parentId)
      if (parent) add(parent)
    }
    result.push(item)
    added.add(id)
  }

  items.forEach(add)
  return result
}

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase.from('navbar').select('*').order('order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items } = await req.json()
  const serviceClient = createServiceClient()

  await serviceClient.from('navbar').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const toInsert = (items as Record<string, unknown>[]).map((item, idx) => ({
    id: typeof item.id === 'string' && !item.id.startsWith('new-') ? item.id : undefined,
    label: item.label,
    href: item.href ?? '/',
    parent_id: item.parent_id ?? null,
    order: idx,
    type: item.type ?? 'link',
  }))

  const sorted = topoSort(toInsert)

  const { data, error } = await serviceClient.from('navbar').upsert(sorted).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
