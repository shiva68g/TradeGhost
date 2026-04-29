'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useNavItems, useUpdateNavItems } from '@/hooks/use-navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

import type { NavItem, NavItemType } from '@/lib/types'

/* =========================
   TYPES
========================= */

type EditFn = (id: string, field: keyof NavItem, value: string | null) => void
type DeleteFn = (id: string) => void
type AddChildFn = (parentId: string, type: NavItemType) => void

/* =========================
   CONFIG
========================= */

const TYPE_OPTIONS: { value: NavItemType; label: string }[] = [
  { value: 'link', label: 'Link' },
  { value: 'title', label: 'Title' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'nested_dropdown', label: 'Nested Dropdown' },
]

/* =========================
   UTILS
========================= */

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getAllDescendantIds(id: string, items: NavItem[]): string[] {
  const children = items.filter(i => i.parent_id === id)
  return [
    ...children.map(c => c.id),
    ...children.flatMap(c => getAllDescendantIds(c.id, items)),
  ]
}

/* 🔥 CORE FIX: ORDER NORMALIZER */
function normalizeOrder(items: NavItem[]): NavItem[] {
  const groups: Record<string, NavItem[]> = {}

  for (const item of items) {
    const key = item.parent_id ?? 'root'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }

  return Object.values(groups).flatMap(group =>
    group
      .sort((a, b) => a.order - b.order)
      .map((item, index) => ({
        ...item,
        order: index,
      }))
  )
}

/* =========================
   TREE NODE
========================= */

function NavTreeNode({
  item,
  allItems,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  item: NavItem
  allItems: NavItem[]
  depth: number
  onEdit: EditFn
  onDelete: DeleteFn
  onAddChild: AddChildFn
}) {
  const children = allItems
    .filter(i => i.parent_id === item.id)
    .sort((a, b) => a.order - b.order)

  const canHaveChildren =
    item.type === 'dropdown' || item.type === 'nested_dropdown'

  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ marginLeft: depth * 20 }} className="space-y-1">
      <div className="flex items-center gap-2 p-2 border rounded-md bg-card">
        <GripVertical className="h-4 w-4 text-muted-foreground" />

        <Select
          value={item.type}
          onValueChange={v => onEdit(item.id, 'type', v)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={item.label}
          onChange={e => onEdit(item.id, 'label', e.target.value)}
          className="h-8"
        />

        {item.type !== 'title' && (
          <Input
            value={item.href ?? ''}
            onChange={e => onEdit(item.id, 'href', e.target.value)}
            className="h-8"
          />
        )}

        {canHaveChildren && (
          <button onClick={() => setExpanded(v => !v)}>
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}

        <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {canHaveChildren && expanded && (
        <div className="space-y-1">
          {children.map(child => (
            <NavTreeNode
              key={child.id}
              item={child}
              allItems={allItems}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}

          <div className="flex gap-2 ml-5">
            {TYPE_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                size="sm"
                variant="outline"
                onClick={() => onAddChild(item.id, opt.value)}
              >
                <Plus className="h-3 w-3" /> {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================
   SORTABLE ROOT
========================= */

function SortableRoot(props: {
  item: NavItem
  allItems: NavItem[]
  onEdit: EditFn
  onDelete: DeleteFn
  onAddChild: AddChildFn
}) {
  const { item, allItems, onEdit, onDelete, onAddChild } = props

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div {...attributes} {...listeners}>
        <NavTreeNode
          item={item}
          allItems={allItems}
          depth={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      </div>
    </div>
  )
}

/* =========================
   MAIN PAGE
========================= */

export default function AdminNavbarPage() {
  const { data, isLoading } = useNavItems()
  const updateNav = useUpdateNavItems()

  const [localItems, setLocalItems] = useState<NavItem[]>([])

  const working = localItems.length ? localItems : data ?? []

  const topLevel = working
    .filter(i => !i.parent_id)
    .sort((a, b) => a.order - b.order)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function update(items: NavItem[]) {
    setLocalItems(normalizeOrder(items))
  }

  function handleEdit(id: string, field: keyof NavItem, value: string | null) {
    update(
      working.map(i => (i.id === id ? { ...i, [field]: value } : i))
    )
  }

  function handleDelete(id: string) {
    const remove = new Set([id, ...getAllDescendantIds(id, working)])
    update(working.filter(i => !remove.has(i.id)))
  }

  function handleAdd(type: NavItemType) {
    update([
      ...working,
      {
        id: genId(),
        label: 'New Item',
        href: '/',
        parent_id: null,
        order: 999,
        type,
      },
    ])
  }

  function handleAddChild(parentId: string, type: NavItemType) {
    update([
      ...working,
      {
        id: genId(),
        label: 'Child Item',
        href: '/',
        parent_id: parentId,
        order: 999,
        type,
      },
    ])
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return

    const oldIndex = topLevel.findIndex(i => i.id === active.id)
    const newIndex = topLevel.findIndex(i => i.id === over.id)

    const reordered = arrayMove(topLevel, oldIndex, newIndex)

    update([
      ...reordered.map((item, i) => ({ ...item, order: i })),
      ...working.filter(i => i.parent_id),
    ])
  }

  async function handleSave() {
    await updateNav.mutateAsync(working)
    setLocalItems([])
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between">
        <h1 className="text-xl font-bold">Navbar Editor</h1>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TYPE_OPTIONS.map(opt => (
          <Button key={opt.value} onClick={() => handleAdd(opt.value)}>
            <Plus className="h-3 w-3" /> {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={topLevel.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {topLevel.map(item => (
              <SortableRoot
                key={item.id}
                item={item}
                allItems={working}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
