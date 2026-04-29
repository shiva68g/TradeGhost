import { ArticlesPageView } from '@/components/blog/articles-page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'All Articles',
}

export default function AllArticlesPage() {
  return (
    <ArticlesPageView
      tab="latest"
      title="All Articles"
      description="Latest news and analysis, newest first."
    />
  )
}
