'use client'

import Button from './Button'
import PostCard from './PostCard'
import type { Post } from './PostCard'

interface BlogListProps {
  posts: Post[]
}

export default function BlogList({ posts }: BlogListProps) {
  const recentPosts = posts.slice(0, 3)

  return (
    <div className="space-y-4">
      {recentPosts.length === 0 ? (
        <div className="text-center py-8 opacity-50 font-mono">
          記事がありません
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {recentPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      <div className="flex justify-center mt-12">
        <Button href="/blog" variant="outline">
          すべての投稿を見る
        </Button>
      </div>
    </div>
  )
}
