'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PostSchema, type PostInput } from '@/lib/validations'
import { usePosts, useCreatePost, useUpdatePost, useDeletePost } from '@/hooks/use-posts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Search, ExternalLink } from 'lucide-react'
import { formatDate, slugify } from '@/lib/utils'
import { toast } from 'sonner'
import type { Post } from '@/lib/types'

const DynamicEditor = dynamic(() => import('@/components/admin/post-editor').then(m => m.PostEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
})

export default function AdminPostsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data, isLoading } = usePosts({ tab: 'latest', includeAll: true })
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()

  const form = useForm<PostInput>({
    resolver: zodResolver(PostSchema),
    defaultValues: { title: '', slug: '', status: 'draft', content: '' },
  })

  const posts = (data?.posts ?? []).filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })
  const allSelected = posts.length > 0 && selectedIds.length === posts.length

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete selected posts')
      }))
      return ids.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success(`${count} post${count === 1 ? '' : 's'} deleted`)
      setSelectedIds([])
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openCreate() {
    form.reset({ title: '', slug: '', status: 'draft', content: '' })
    setContent('')
    setEditPost(null)
    setDialogOpen(true)
  }

  function openEdit(post: Post) {
    setEditPost(post)
    form.reset({
      title: post.title,
      slug: post.slug,
      status: post.status,
      content: post.content ?? '',
      excerpt: post.excerpt ?? '',
      cover_image: post.cover_image ?? '',
      cover_image_alt: post.cover_image_alt ?? '',
      meta_title: post.meta_title ?? '',
      meta_description: post.meta_description ?? '',
    })
    setContent(post.content ?? '')
    setDialogOpen(true)
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : posts.map((post) => post.id))
  }

  function getPostViewUrl(post: Post) {
    return post.status === 'published' ? `/articles/${post.slug}` : `/articles/${post.slug}?preview=1`
  }

  async function onSubmit(values: PostInput) {
    const postData = { ...values, content }
    if (editPost) {
      await updatePost.mutateAsync({ id: editPost.id, data: postData })
    } else {
      await createPost.mutateAsync(postData)
    }
    setDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Posts</h1>
        <div className="flex flex-wrap items-center gap-2">
          {posts.length > 0 && (
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
                  <AlertDialogTitle>Delete selected posts?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => bulkDelete.mutate(selectedIds)} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />New Post
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setSelectedIds([]) }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border" aria-label="Select all posts" />
                </th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Views</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.includes(post.id)} onChange={() => toggleSelected(post.id)} className="h-4 w-4 rounded border-border" aria-label={`Select ${post.title}`} />
                  </td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate" title={post.title}>{post.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant={post.status === 'published' ? 'success' : 'secondary'}>
                      {post.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{post.views}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(post.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <a href={getPostViewUrl(post)} target="_blank" rel="noopener noreferrer" title={post.status === 'published' ? 'View post' : 'Preview draft'}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(post)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete post?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePost.mutate(post.id, { onSuccess: () => setSelectedIds((current) => current.filter((id) => id !== post.id)) })}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search || statusFilter !== 'all' ? 'No posts match your filter.' : 'No posts yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPost ? 'Edit Post' : 'New Post'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="content">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      {...form.register('title')}
                      onChange={(e) => {
                        form.setValue('title', e.target.value)
                        if (!editPost) form.setValue('slug', slugify(e.target.value))
                      }}
                    />
                    {form.formState.errors.title && (
                      <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input {...form.register('slug')} />
                    {form.formState.errors.slug && (
                      <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Excerpt</Label>
                  <Input {...form.register('excerpt')} placeholder="Brief description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cover Image URL</Label>
                    <Input {...form.register('cover_image')} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Cover Image Alt Text</Label>
                    <Input {...form.register('cover_image_alt')} placeholder="Describe the image..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(v) => form.setValue('status', v as 'draft' | 'published')}
                  >
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
                <div className="space-y-2">
                  <Label>Meta Title <span className="text-muted-foreground text-xs">(max 70 chars)</span></Label>
                  <Input {...form.register('meta_title')} maxLength={70} />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description <span className="text-muted-foreground text-xs">(max 160 chars)</span></Label>
                  <Input {...form.register('meta_description')} maxLength={160} />
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPost.isPending || updatePost.isPending}>
                {editPost ? 'Save Changes' : 'Create Post'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
