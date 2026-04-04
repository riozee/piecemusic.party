/** Shared types for the download portal feature. */

export interface AlbumInfo {
  id: string
  title: string
  description: string
  cover: string
}

export interface Track {
  title: string
  /** R2 object key, e.g. "album-id/filename.mp3" */
  filename: string
  description?: string
  /** Optional duration string, e.g. "3:42" */
  duration?: string
}

export interface AlbumData {
  album: AlbumInfo
  tracks: Track[]
}
