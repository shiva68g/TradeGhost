import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
  searchParams?: { preview?: string }
}

export default function PostRedirect({ params, searchParams }: Props) {
  redirect(`/articles/${params.slug}${searchParams?.preview === '1' ? '?preview=1' : ''}`)
}
