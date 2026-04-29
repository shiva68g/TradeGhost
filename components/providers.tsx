'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 25_000,
            refetchInterval: 30_000,
            refetchOnWindowFocus: true,
            retry: 2,
          },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          {children}
          <Toaster richColors position="top-right" />
        </NuqsAdapter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
