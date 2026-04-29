import { NextRequest, NextResponse } from 'next/server' // footer route
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { FooterColumnWithItems, FooterItem } from '@/lib/types'

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

  const [{ data: columns, error: colError }, { data: items, error: itemError }] = await Promise.all([
    supabase.from('footer_columns').select('*').order('order'),
    supabase.from('footer').select('*').order('order'),
  ])

  if (colError) return NextResponse.json({ error: colError.message }, { status: 500 })
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })

  const columnsWithItems: FooterColumnWithItems[] = (columns ?? []).map(col => ({
    id: col.id as string,
    title: col.title as string,
    order: col.order as number,
    items: ((items ?? []) as FooterItem[]).filter(i => i.column_id === col.id),
  }))

  const uncategorized: FooterItem[] = ((items ?? []) as FooterItem[]).filter(i => !i.column_id)

  return NextResponse.json({ columns: columnsWithItems, uncategorized })
}

export async function PUT(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { columns } = (await req.json()) as { columns: FooterColumnWithItems[] }
  const serviceClient = createServiceClient()

  await serviceClient.from('footer').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await serviceClient.from('footer_columns').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (!columns || columns.length === 0) {
    return NextResponse.json({ success: true })
  }

  const colsToInsert = columns.map((col, idx) => ({
    title: col.title,
    order: idx,
  }))

  const { data: insertedCols, error: colErr } = await serviceClient
    .from('footer_columns')
    .insert(colsToInsert)
    .select()

  if (colErr) return NextResponse.json({ error: colErr.message }, { status: 500 })

  const sortedCols = ((insertedCols ?? []) as { id: string; order: number }[]).sort(
    (a, b) => a.order - b.order
  )

  // Build all items with parent_id references — topological sort ensures parents inserted first
  const allItems = columns.flatMap((col, colIdx) => {
    const newColId = sortedCols[colIdx]?.id ?? null
    return (col.items ?? []).map((item, itemIdx) => ({
      id: item.id,
      label: item.label ?? '',
      href: item.href ?? '/',
      column_id: newColId,
      order: itemIdx,
      type: item.type ?? 'link',
      parent_id: (item as FooterItem & { parent_id?: string | null }).parent_id ?? null,
    }))
  })

  const sorted = topoSort(allItems as Record<string, unknown>[])

  if (sorted.length > 0) {
    const { error: itemErr } = await serviceClient.from('footer').insert(sorted)
    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
