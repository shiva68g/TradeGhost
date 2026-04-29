'use client' // use-nav

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { NavItem, FooterColumnWithItems } from '@/lib/types'

export function useNavItems() {
  return useQuery<NavItem[]>({
    queryKey: ['navbar'],
    queryFn: async () => {
      const res = await fetch('/api/navbar')
      if (!res.ok) throw new Error('Failed to load navbar')
      const { data } = await res.json()
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })
}

export function useUpdateNavItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (items: NavItem[]) => {
      const res = await fetch('/api/navbar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) throw new Error('Failed to save navbar')
      return res.json()
    },
    onSuccess: (data) => {
  queryClient.setQueryData(['navbar'], data.data) // 🔥 instant UI update
  toast.success('Navbar saved')
},
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useFooterColumns() {
  return useQuery<FooterColumnWithItems[]>({
    queryKey: ['footer'],
    queryFn: async () => {
      const res = await fetch('/api/footer')
      if (!res.ok) throw new Error('Failed to load footer')
      const { columns } = await res.json()
      return columns ?? []
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })
}

export function useUpdateFooterColumns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (columns: FooterColumnWithItems[]) => {
      const res = await fetch('/api/footer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns }),
      })
      if (!res.ok) throw new Error('Failed to save footer')
      return res.json()
    },
    onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['footer'] })
  toast.success('Footer saved')
},
    onError: (err: Error) => toast.error(err.message),
  })
}
