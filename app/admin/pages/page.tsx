'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageSchema, type PageInput } from '@/lib/validations'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { formatDate, slugify } from '@/lib/utils'
import { toast } from 'sonner'
import type { Page } from '@/lib/types'

const DynamicEditor = dynamic(() => import('@/components/admin/post-editor').then(m => m.PostEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})

function usePages() {
  return useQuery<Page[]>({
    queryKey: ['pages'],
    queryFn: async () => {
      const res = await fetch('/api/pages')
      if (!res.ok) throw new Error('Failed to load pages')
      const { data } = await res.json()
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })
}

export default function AdminPagesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editPage, setEditPage] = useState<Page | null>(null)
  const [content, setContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { data: pages, isLoading } = usePages()
  const queryClient = useQueryClient()
  const pageItems = pages ?? []
  const allSelected = pageItems.length > 0 && selectedIds.length === pageItems.length

  const form = useForm<PageInput>({
    resolver: zodResolver(PageSchema),
    defaultValues: { title: '', slug: '', status: 'draft' },
  })

  const savePage = useMutation({
    mutationFn: async (values: PageInput & { content: string }) => {
      const url = editPage ? `/api/pages/${editPage.id}` : '/api/pages'
      const method = editPage ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success(editPage ? 'Page updated' : 'Page created')
      setDialogOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success('Page deleted')
      setSelectedIds((current) => current.filter((itemId) => itemId !== id))
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete selected pages')
      }))
      return ids.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success(`${count} page${count === 1 ? '' : 's'} deleted`)
      setSelectedIds([])
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openCreate() {
    form.reset({ title: '', slug: '', status: 'draft' })
    setContent('')
    setEditPage(null)
    setDialogOpen(true)
  }

  function openEdit(page: Page) {
    setEditPage(page)
    form.reset({ title: page.title, slug: page.slug, status: page.status, meta_title: page.meta_title ?? '', meta_description: page.meta_description ?? '' })
    setContent(page.content ?? '')
    setDialogOpen(true)
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : pageItems.map((page) => page.id))
  }

  function getPageViewUrl(page: Page) {
    return page.status === 'published' ? `/${page.slug}` : `/${page.slug}?preview=1`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pages</h1>
        <div className="flex flex-wrap items-center gap-2">
          {pageItems.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border" />
              Select all
            </label>
          )}
          {selectedIds.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={bulkDelete.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete selected ({selectedIds.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete selected pages?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => bulkDelete.mutate(selectedIds)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />New Page</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border" aria-label="Select all pages" />
                </th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((page) => (
                <tr key={page.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.includes(page.id)} onChange={() => toggleSelected(page.id)} className="h-4 w-4 rounded border-border" aria-label={`Select ${page.title}`} />
                  </td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate" title={page.title}>{page.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">/{page.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={page.status === 'published' ? 'success' : 'secondary'}>{page.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(page.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <a href={getPageViewUrl(page)} target="_blank" rel="noopener noreferrer" title={page.status === 'published' ? 'View page' : 'Preview draft'}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(page)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete page?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePage.mutate(page.id)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No pages yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPage ? 'Edit Page' : 'New Page'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => savePage.mutate({ ...v, content }))} className="space-y-4">
            <Tabs defaultValue="content">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input {...form.register('title')} onChange={(e) => { form.setValue('title', e.target.value); if (!editPage) form.setValue('slug', slugify(e.target.value)) }} />
                    {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input {...form.register('slug')} />
                    {form.formState.errors.slug && <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'draft' | 'published')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <DynamicEditor content={content} onChange={setContent} />
                </div>
              </TabsContent>
              <TabsContent value="seo" className="space-y-4 mt-4">
                <div className="space-y-2"><Label>Meta Title</Label><Input {...form.register('meta_title')} maxLength={70} /></div>
                <div className="space-y-2"><Label>Meta Description</Label><Input {...form.register('meta_description')} maxLength={160} /></div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={savePage.isPending}>{editPage ? 'Save' : 'Create'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
