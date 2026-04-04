/** Shared types for the download portal feature. */

export interface AlbumInfo {
  id: string
  title: string
  description: string
  cover: string
}

/**
 * Track schema — mirrors the `works` MDX frontmatter fields so that
 * per-track data can be hardcoded in page.tsx with the same shape.
 */
export interface Track {
  title: string
  /** R2 object key, e.g. "album-id/filename.mp3" */
  filename: string
  /** Optional duration string, e.g. "3:42" */
  duration?: string
  /** Per-track cover/thumbnail (falls back to album cover if omitted) */
  cover?: string
  /** Short blurb shown below the title */
  description?: string
  /** Release / publish date */
  date?: string

  // --- Staff credits (same as works MDX) ---
  author?: string
  vocal?: string
  lyric?: string
  music?: string
  arrangement?: string
  illust?: string
  movie?: string

  tags?: string[]
  links?: { label: string; url: string }[]

  /**
   * Compiled MDX body string (from Velite `s.mdx()` or a hand-crafted
   * `compile()` output).  Rendered via `<MDXContent code={body} />`.
   */
  body?: string
}

export interface AlbumData {
  album: AlbumInfo
  tracks: Track[]
}
