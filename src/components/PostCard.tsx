import Link from 'next/link'
import Image from 'next/image'

export type Post = {
  slug: string
  title: string
  date: string
  permalink: string
  description?: string
  cover?: string
  tags?: string[]
  author?: string
}

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link href={post.permalink} className="block group cursor-target">
      <div className="border border-foreground/10 bg-background/80 p-4 hover:bg-foreground/20 hover:rounded-lg flex items-stretch gap-4 transition-all duration-300">
        {post.cover && (
          <div className="shrink-0 w-24 md:w-32 aspect-square md:aspect-video relative">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 96px, 128px"
              className="rounded object-cover"
            />
          </div>
        )}

        <div className="flex flex-col grow min-w-0">
          <h3 className="text-lg md:text-xl font-bold group-hover:text-primary-blue transition-colors leading-tight">
            {post.title}
          </h3>
          <div className="text-xs opacity-50 mt-1">
            {post.author && (
              <span className="text-primary-blue">
                {post.author} <span className="text-foreground">| </span>
              </span>
            )}
            {post.date}
          </div>
          {post.description && (
            <p className="opacity-60 text-sm mt-2">{post.description}</p>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-2 py-0.5 bg-foreground/10 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
