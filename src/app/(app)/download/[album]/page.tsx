import { notFound } from 'next/navigation'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { AlbumPortal } from '@/components/portal'
import type { AlbumData } from '@/components/portal/types'
import { albumCatalogue, albumSlugs } from '../_data/albums'

// ---------------------------------------------------------------------------
// NO SEO metadata — intentionally omitted for gated content pages.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Server-side MDX compilation
// ---------------------------------------------------------------------------

/**
 * Compile a raw MDX source string into a function-body string that
 * `<MDXContent>` can evaluate on the client via `new Function(code)`.
 */
async function compileMdxBody(src: string): Promise<string> {
  const vfile = await compile(src, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm],
  })
  return String(vfile)
}

/** Compile every track body in an AlbumData object. */
async function resolveAlbumData(data: AlbumData): Promise<AlbumData> {
  const tracks = await Promise.all(
    data.tracks.map(async (track) => ({
      ...track,
      body: track.body ? await compileMdxBody(track.body) : undefined,
    }))
  )
  return { ...data, tracks }
}

// ---------------------------------------------------------------------------
// Static params for `output: 'export'`
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return albumSlugs.map((album) => ({ album }))
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ album: string }>
}

export default async function AlbumPage({ params }: PageProps) {
  const { album } = await params
  const data = albumCatalogue[album]

  if (!data) notFound()

  const resolved = await resolveAlbumData(data)
  return <AlbumPortal data={resolved} />
}
