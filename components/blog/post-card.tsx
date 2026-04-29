import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, truncate } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {post.cover_image && (
        <div className="relative aspect-video">
          <Image
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">{formatDate(post.created_at)}</Badge>
          <span className="text-xs text-muted-foreground">{post.views} views</span>
        </div>
        <Link href={`/articles/${post.slug}`}>
          <h2 className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2 mb-2">
            {post.title}
          </h2>
        </Link>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {truncate(post.excerpt, 150)}
          </p>
        )}
        <Link href={`/articles/${post.slug}`} className="inline-flex items-center text-sm font-medium text-primary hover:underline mt-3">
          Read more →
        </Link>
      </CardContent>
    </Card>
  )
}

export function FeaturedPostCard({ post }: PostCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {post.cover_image && (
        <div className="relative aspect-[16/7]">
          <Image
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 70vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <Badge className="mb-2 bg-primary">Featured</Badge>
            <h2 className="text-2xl font-bold line-clamp-2">{post.title}</h2>
            {post.excerpt && <p className="text-sm opacity-90 mt-1 line-clamp-2">{post.excerpt}</p>}
          </div>
        </div>
      )}
      {!post.cover_image && (
        <CardContent className="p-6">
          <Badge className="mb-2">Featured</Badge>
          <Link href={`/articles/${post.slug}`}>
            <h2 className="text-2xl font-bold hover:text-primary transition-colors">{post.title}</h2>
          </Link>
          {post.excerpt && <p className="text-muted-foreground mt-2">{post.excerpt}</p>}
        </CardContent>
      )}
      <CardContent className="p-4 pt-2">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formatDate(post.created_at)}</span>
          <span>{post.views} views</span>
          <Link href={`/articles/${post.slug}`} className="ml-auto text-primary font-medium hover:underline">
            Read more →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
