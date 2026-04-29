'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useFooterColumns, useUpdateFooterColumns } from '@/hooks/use-navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GripVertical, Plus, Trash2, Save, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react'
import type { FooterColumnWithItems, FooterItem, FooterItemType } from '@/lib/types'

const TYPE_OPTIONS: { value: FooterItemType; label: string }[] = [
  { value: 'link', label: 'Link' },
  { value: 'title', label: 'Title' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'nested_dropdown', label: 'Nested' },
  { value: 'separator', label: 'Separator' },
]

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getAllDescendantIds(id: string, items: FooterItem[]): string[] {
  const children = items.filter(i => i.parent_id === id)
  return [...children.map(c => c.id), ...children.flatMap(c => getAllDescendantIds(c.id, items))]
}

// Recursive tree node for footer items
function FooterTreeNode({
  item,
  allItems,
  colId,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  item: FooterItem
  allItems: FooterItem[]
  colId: string
  depth: number
  onEdit: (colId: string, id: string, field: string, value: string) => void
  onDelete: (colId: string, id: string) => void
  onAddChild: (colId: string, parentId: string, type: FooterItemType) => void
}) {
  const children = allItems.filter(i => i.parent_id === item.id).sort((a, b) => a.order - b.order)
  const canHaveChildren = item.type === 'dropdown' || item.type === 'nested_dropdown'
  const isSeparator = item.type === 'separator'
  const isTitle = item.type === 'title'
  const [expanded, setExpanded] = useState(true)
  const indentPx = depth * 16

  return (
    <div style={{ marginLeft: indentPx }} className="space-y-1">
      <div className={`flex items-center gap-2 rounded-md border bg-background p-2 flex-wrap hover:bg-muted/20 ${depth > 0 ? 'border-l-2 border-l-primary/30' : ''}`}>
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

        <Select value={item.type ?? 'link'} onValueChange={v => onEdit(colId, item.id, 'type', v)}>
          <SelectTrigger className="h-7 w-[110px] shrink-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {isSeparator ? (
          <div className="flex-1 border-t border-dashed border-muted-foreground/40 mx-1" />
        ) : (
          <>
            <Input
              value={item.label}
              onChange={e => onEdit(colId, item.id, 'label', e.target.value)}
              placeholder={isTitle ? 'Section heading' : 'Label'}
              className="h-7 flex-1 min-w-[60px] text-xs"
            />
            {!isTitle && !canHaveChildren && (
              <Input
                value={item.href}
                onChange={e => onEdit(colId, item.id, 'href', e.target.value)}
                placeholder="/path"
                className="h-7 flex-1 min-w-[60px] text-xs"
              />
            )}
            {canHaveChildren && (
              <Input
                value={item.label}
                onChange={e => onEdit(colId, item.id, 'label', e.target.value)}
                placeholder="Dropdown label"
                className="h-7 flex-1 min-w-[60px] text-xs hidden"
                aria-hidden
              />
            )}
          </>
        )}

        {canHaveChildren && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs shrink-0"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {children.length}
          </button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive shrink-0"
          onClick={() => onDelete(colId, item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {canHaveChildren && expanded && (
        <div className="space-y-1">
          {children.map(child => (
            <FooterTreeNode
              key={child.id}
              item={child}
              allItems={allItems}
              colId={colId}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
          <div style={{ marginLeft: (depth + 1) * 16 }} className="flex gap-1.5 flex-wrap pt-0.5 pb-1">
            {TYPE_OPTIONS.map(o => (
              <Button
                key={o.value}
                variant="outline"
                size="sm"
                className="h-6 gap-1 text-xs border-dashed px-2"
                onClick={() => onAddChild(colId, item.id, o.value)}
              >
                <Plus className="h-2.5 w-2.5" /> {o.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SortableFooterItem(props: React.ComponentProps<typeof FooterTreeNode>) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 p-1">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1">
        <FooterTreeNode {...props} />
      </div>
    </div>
  )
}

export default function AdminFooterPage() {
  const { data, isLoading } = useFooterColumns()
  const updateFooter = useUpdateFooterColumns()
  const [localColumns, setLocalColumns] = useState<FooterColumnWithItems[] | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (data && localColumns === null) {
      setLocalColumns(JSON.parse(JSON.stringify(data)))
    }
  }, [data, localColumns])

  const working = localColumns !== null ? localColumns : (data ?? [])

  function addColumn() {
    setLocalColumns([...working, { id: genId(), title: 'New Section', order: working.length, items: [] }])
  }

  function editColumnTitle(colId: string, title: string) {
    setLocalColumns(working.map(c => c.id === colId ? { ...c, title } : c))
  }

  function deleteColumn(colId: string) {
    setLocalColumns(working.filter(c => c.id !== colId).map((c, i) => ({ ...c, order: i })))
  }

  function addItem(colId: string, type: FooterItemType = 'link', parentId?: string) {
    const id = genId()
    setLocalColumns(working.map(c => {
      if (c.id !== colId) return c
      const siblings = parentId ? c.items.filter(i => i.parent_id === parentId) : c.items.filter(i => !i.parent_id)
      return {
        ...c,
        items: [
          ...c.items,
          {
            id,
            label: type === 'title' ? 'Section Heading' : type === 'separator' ? '' : type === 'dropdown' ? 'Dropdown' : type === 'nested_dropdown' ? 'Nested' : 'New Link',
            href: '/',
            column_id: colId,
            order: siblings.length,
            type,
            parent_id: parentId ?? null,
          } as FooterItem,
        ],
      }
    }))
  }

  function editItem(colId: string, itemId: string, field: string, value: string) {
    setLocalColumns(working.map(c =>
      c.id === colId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) }
        : c
    ))
  }

  function deleteItem(colId: string, itemId: string) {
    setLocalColumns(working.map(c => {
      if (c.id !== colId) return c
      const toRemove = new Set([itemId, ...getAllDescendantIds(itemId, c.items)])
      return { ...c, items: c.items.filter(i => !toRemove.has(i.id)).map((i, idx) => ({ ...i, order: idx })) }
    }))
  }

  function handleDragEnd(colId: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLocalColumns(working.map(c => {
      if (c.id !== colId) return c
      const rootItems = c.items.filter(i => !i.parent_id)
      const oldIdx = rootItems.findIndex(i => i.id === active.id)
      const newIdx = rootItems.findIndex(i => i.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return c
      const reordered = arrayMove(rootItems, oldIdx, newIdx).map((i, idx) => ({ ...i, order: idx }))
      return { ...c, items: [...reordered, ...c.items.filter(i => i.parent_id)] }
    }))
  }

  async function handleSave() {
    await updateFooter.mutateAsync(working)
    setLocalColumns(null)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Footer Editor</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addColumn}>
            <FolderPlus className="h-4 w-4 mr-1" /> Add Column
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateFooter.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {updateFooter.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : working.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          <p className="mb-3">No footer columns yet.</p>
          <Button variant="outline" size="sm" onClick={addColumn}>
            <FolderPlus className="h-4 w-4 mr-1" /> Add First Column
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {working.map(col => {
            const rootItems = col.items.filter(i => !i.parent_id).sort((a, b) => a.order - b.order)
            return (
              <Card key={col.id}>
                <CardHeader className="p-4 pb-2 flex-row items-center gap-3">
                  <Input
                    value={col.title}
                    onChange={e => editColumnTitle(col.id, e.target.value)}
                    className="h-9 font-semibold max-w-xs"
                    placeholder="Column Title"
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive ml-auto">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete column?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove the column and all its items.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteColumn(col.id)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-2">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(col.id, e)}>
                    <SortableContext items={rootItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
                        {rootItems.map(item => (
                          <SortableFooterItem
                            key={item.id}
                            item={item}
                            allItems={col.items}
                            colId={col.id}
                            depth={0}
                            onEdit={editItem}
                            onDelete={deleteItem}
                            onAddChild={(colId, parentId, type) => addItem(colId, type, parentId)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {rootItems.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">No items. Add below.</p>
                  )}

                  <div className="flex gap-2 flex-wrap mt-2 pt-1 border-t">
                    {TYPE_OPTIONS.map(o => (
                      <Button
                        key={o.value}
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs border-dashed"
                        onClick={() => addItem(col.id, o.value)}
                      >
                        <Plus className="h-3 w-3" /> {o.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
