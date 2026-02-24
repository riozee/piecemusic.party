import BlogList from './BlogList'
import { Post } from '#site/content'

interface HomeBlogSectionProps {
  posts: Post[]
}

export default function HomeBlogSection({ posts }: HomeBlogSectionProps) {
  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-12 border-b border-foreground/30 pb-2 relative">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl md:text-5xl font-mono tracking-tighter">
            <span data-text="LATEST_最新のブログ投稿LOGS">
              最新のブログ投稿
            </span>
          </h2>
        </div>
      </div>

      <div className="relative">
        <BlogList posts={posts} />
      </div>
    </section>
  )
}
