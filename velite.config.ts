import { defineConfig, s } from 'velite'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'

const prettyCodeOptions = {
  theme: 'rose-pine-moon',
  keepBackground: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onVisitLine(node: any) {
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }]
    }
  },
}

export default defineConfig({
  root: 'content',
  mdx: {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex, [rehypePrettyCode, prettyCodeOptions]],
  },
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: {
    posts: {
      name: 'Post',
      pattern: 'posts/**/*.mdx',
      schema: s
        .object({
          slug: s.path(),
          title: s.string().max(99),
          // the `type` field has been removed; all posts are treated equally
          // as standard articles.  Frontmatter no longer needs to specify it.
          date: s.string(), // YYYY-MM-DD
          // optional tags for categorizing posts, enables filtering
          tags: s.array(s.string()).default([]),
          description: s.string().max(999).optional(),
          author: s.string().optional(),
          // cover can be a local image path or an external URL
          cover: s.string().optional(),
          body: s.mdx(),
        })
        .transform((data) => ({
          ...data,
          slug: data.slug.split('/').pop() as string,
          permalink: `/blog/${data.slug.split('/').pop()}`,
        })),
    },
    works: {
      name: 'Work',
      pattern: 'works/**/*.mdx',
      schema: s
        .object({
          slug: s.path(),
          title: s.string().max(99),
          date: s.string(), // Release date
          description: s.string().max(999),
          author: s.string(), // Composer/Creator
          tags: s.array(s.string()).default([]), // Pop, Rock, EDM, etc.
          // Artwork cover may point to a local file or external URL
          cover: s.string().optional(), // Artwork
          // `audio` and `video` fields have been removed from the schema.
          // instead we now support an optional `download` field which can
          // point to an external file or asset the user can fetch.
          download: s.string().optional(), // Download URL (e.g. MP3, ZIP)
          // When true, the download link leads to a password-protected
          // access-card site.  A modal with instructions and cautions
          // will be shown before redirecting.
          accessCard: s.boolean().default(false),

          // Staff Credits
          vocal: s.string().optional(),
          lyric: s.string().optional(),
          music: s.string().optional(),
          arrangement: s.string().optional(),
          illust: s.string().optional(),
          movie: s.string().optional(),

          links: s
            .array(s.object({ label: s.string(), url: s.string() }))
            .optional(), // Links to streaming services etc.
          highlight: s.boolean().default(false), // Display on top page?
          body: s.mdx(),
        })
        .transform((data) => ({
          ...data,
          slug: data.slug.split('/').pop() as string,
          permalink: `/works/${data.slug.split('/').pop()}`,
        })),
    },
    events: {
      name: 'Event',
      pattern: 'events/**/*.mdx',
      schema: s
        .object({
          slug: s.path(),
          title: s.string().max(99),
          date: s.string(), // Event date
          // an optional human-readable time string used purely for
          // display (e.g. "14:00 – 16:00" or "10AM–4PM").  The
          // `date` field already provides the day itself, so we
          // separate the two for clarity in the UI.
          time: s.string().optional(),
          location: s.string().optional(),
          description: s.string().max(999),
          // cover may be remote or local
          cover: s.string().optional(),
          // the `status` field has been removed; whether an event is
          // upcoming or past will be derived dynamically from its date
          // when the site renders. Existing frontmatter may still include
          // `status`, but it will be ignored.
          links: s
            .array(s.object({ label: s.string(), url: s.string() }))
            .optional(),
          body: s.mdx(),
        })
        .transform((data) => ({
          ...data,
          slug: data.slug.split('/').pop() as string,
          permalink: `/events/${data.slug.split('/').pop()}`,
        })),
    },
  },
})
