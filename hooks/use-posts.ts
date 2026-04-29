'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Post } from '@/lib/types'

export function usePosts(params?: { tab?: string; page?: number; limit?: number; q?: string; includeAll?: boolean }) {
  const searchParams = new URLSearchParams()
  if (params?.tab) searchParams.set('tab', params.tab)
  if (params?.page && params.page > 1) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.q) searchParams.set('q', params.q)
  if (params?.includeAll) searchParams.set('includeAll', 'true')

  return useQuery<{ posts: Post[]; nextCursor: string | null; hasMore: boolean; page: number; total: number }>({
    queryKey: ['posts', params],
    queryFn: async () => {
      const res = await fetch(`/api/posts?${searchParams.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch posts')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })
}

export function usePost(id: string) {
  return useQuery<Post>({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${id}`)
      if (!res.ok) throw new Error('Failed to fetch post')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Post>) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create post')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Post> }) => {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to update post')
      }
      return res.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      toast.success('Post updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete post')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
