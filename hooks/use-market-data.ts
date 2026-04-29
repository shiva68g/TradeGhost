'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MarketData } from '@/lib/types'

export function useMarketData(category: string) {
  const query = useQuery<MarketData | null>({
    queryKey: ['market_data', category],
    queryFn: async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('market_data')
          .select('*')
          .eq('id', category)
          .single()
        if (error) return null
        return data
      } catch {
        return null
      }
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  const isStale =
    query.data?.updated_at != null &&
    Date.now() - new Date(query.data.updated_at).getTime() > 120_000

  return { ...query, isStale }
}
