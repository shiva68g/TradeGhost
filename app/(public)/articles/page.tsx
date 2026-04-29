import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ArticlesPage() {
  redirect('/articles/all-articles')
}
