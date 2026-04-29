'use client'

import { useQueryState, parseAsInteger } from 'nuqs'
import { usePosts } from '@/hooks/use-posts'
import { PostCard } from '@/components/blog/post-card'
import { MarketSidebar } from '@/components/market/market-sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const PAGE_LIMIT = 20

// ── Sliding window pagination ─────────────────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  // Build window: 5 consecutive pages starting from currentPage
  const windowPages: number[] = []
  for (let i = currentPage; i < currentPage + 5 && i <= totalPages; i++) {
    windowPages.push(i)
  }

  const lastInWindow = windowPages[windowPages.length - 1]
  const showEllipsis = lastInWindow < totalPages - 1
  const showLastPage = lastInWindow < totalPages

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      {/* First page << */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(1)}
        aria-label="First page"
        title="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Previous */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Sliding window pages */}
      {windowPages.map((p) => (
        <Button
          key={p}
          variant={p === currentPage ? 'default' : 'outline'}
          size="icon"
          className="h-9 w-9"
          onClick={() => onPageChange(p)}
          aria-current={p === currentPage ? 'page' : undefined}
        >
          {p}
        </Button>
      ))}

      {/* Ellipsis */}
      {showEllipsis && (
        <span className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground select-none">
          ...
        </span>
      )}

      {/* Last page */}
      {showLastPage && (
        <Button
          variant={totalPages === currentPage ? 'default' : 'outline'}
          size="icon"
          className="h-9 w-9"
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </Button>
      )}

      {/* Next */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last page >> */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label="Last page"
        title="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

// ── Post grid ─────────────────────────────────────────────────────────────────
function PostGrid({
  tab,
  page,
  q,
  onPageChange,
}: {
  tab: string
  page: number
  q: string
  onPageChange: (p: number) => void
}) {
  const { data, isLoading } = usePosts({ tab, page, q: q || undefined, limit: PAGE_LIMIT })

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  const posts = data?.posts ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_LIMIT)

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <p className="col-span-2 py-12 text-center text-muted-foreground">No posts found.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} &nbsp;·&nbsp; {total} articles
          </span>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  )
}

// ── Main exported view ────────────────────────────────────────────────────────
export function ArticlesPageView({
  tab,
  title,
  description,
}: {
  tab: string
  title: string
  description?: string
}) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [q, setQ] = useQueryState('q', { defaultValue: '' })
  const [search, setSearch] = useState(q)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQ(search.trim() || null)
    setPage(1)
  }

  function handlePageChange(p: number) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            <form onSubmit={handleSearch} className="relative ml-auto">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-56"
              />
            </form>
          </div>

          {/* Active search indicator */}
          {q && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Results for:{' '}
              <span className="font-medium text-foreground">&quot;{q}&quot;</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setQ(null)
                  setSearch('')
                  setPage(1)
                }}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Grid + pagination */}
          <PostGrid tab={tab} page={page} q={q} onPageChange={handlePageChange} />
        </div>

        {/* Market sidebar */}
        <div className="w-full">
          <div className="lg:sticky lg:top-20">
            <MarketSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}
