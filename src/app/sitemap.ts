import type { MetadataRoute } from 'next'
import { posts, events, works } from '#site/content'
import { absoluteUrl } from '@/lib/site-config'

export const dynamic = 'force-static'
export const revalidate = false

const parseDate = (value?: string) => {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/blog'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/events'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/works'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/download'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(post.permalink),
    lastModified: parseDate(post.date) ?? now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: absoluteUrl(event.permalink),
    lastModified: parseDate(event.date) ?? now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const workRoutes: MetadataRoute.Sitemap = works.map((work) => ({
    url: absoluteUrl(work.permalink),
    lastModified: parseDate(work.date) ?? now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...postRoutes, ...eventRoutes, ...workRoutes]
}
