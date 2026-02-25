/**
 * Module-level singleton that lets any component read the current playback
 * position of the primary VideoBackground video.
 *
 * Usage:
 *   VideoBackground   → registerSourceVideo(videoEl)
 *   ScrollEndSequence → getSourceCurrentTime()
 */

let sourceVideo: HTMLVideoElement | null = null

/** Called once by VideoBackground after the element mounts. */
export function registerSourceVideo(el: HTMLVideoElement | null) {
  sourceVideo = el
}

/**
 * Returns the current playback time (seconds) of the registered source video,
 * or 0 if none has been registered yet.
 */
export function getSourceCurrentTime(): number {
  return sourceVideo?.currentTime ?? 0
}
