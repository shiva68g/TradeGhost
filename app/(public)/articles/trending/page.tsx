import { ArticlesPageView } from '@/components/blog/articles-page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Trending This Week',
}

export default function TrendingArticlesPage() {
  return (
    <ArticlesPageView
      tab="trending"
      title="Trending This Week"
      description="Most viewed posts published this week."
    />
  )
}
