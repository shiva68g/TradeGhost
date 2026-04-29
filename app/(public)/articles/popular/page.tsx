import { ArticlesPageView } from '@/components/blog/articles-page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Popular Articles',
}

export default function PopularArticlesPage() {
  return (
    <ArticlesPageView
      tab="popular"
      title="Popular Articles"
      description="All articles ranked by total views — most read first."
    />
  )
}
