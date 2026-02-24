/**
 * ============================================================================
 * TWEET MERGER
 * ============================================================================
 *
 * ── WORKFLOW (PASTE → COPY → MERGE → PUSH) ──────────────────────────────
 *
 *  1. PASTE  — Run tweet-scraper.console.js in the browser DevTools console.
 *              Click "⏹ Stop & Copy" when done. Results land in your clipboard.
 *
 *  2. COPY   — Create (or overwrite) `x-scraper/tweets.json` in the project
 *              root and paste the clipboard into it.
 *
 *  3. MERGE  — Run this script from the project root:
 *                  node x-scraper/merge-tweets.js
 *              It reads x-scraper/tweets.json, merges into public/tweets.json,
 *              deduplicates by tweet ID, and sorts newest-first.
 *
 *  4. PUSH   — Commit and push. x-scraper/tweets.json is gitignored so it
 *              won't be included in the commit — only public/tweets.json will.
 *
 * ============================================================================
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'

// tweets.json  → your temp paste file (gitignored, lives in x-scraper/)
// public/tweets.json → the real data file served by the site
const NEW_PATH = new URL('./tweets.json', import.meta.url).pathname
const BASE_PATH = new URL('../public/tweets.json', import.meta.url).pathname

// ── READ FILES ──────────────────────────────────────────────────────────────

if (!existsSync(NEW_PATH)) {
  console.error(`❌ Could not find ${NEW_PATH}`)
  console.log(
    'Paste the browser console output into tweets.json first, then re-run.'
  )
  process.exit(1)
}

const raw = JSON.parse(readFileSync(NEW_PATH, 'utf-8'))

// Support both the new { updatedAt, data: [] } shape and a plain array
const incoming = Array.isArray(raw) ? raw : raw.data
const incomingUpdatedAt = Array.isArray(raw) ? null : raw.updatedAt

const existing = existsSync(BASE_PATH)
  ? JSON.parse(readFileSync(BASE_PATH, 'utf-8'))
  : { updatedAt: null, data: [] }

// Support both the new { updatedAt, data: [] } shape and a plain array
const existingData = Array.isArray(existing) ? existing : existing.data

console.log(
  `📥 Incoming: ${incoming.length} tweets (scraped ${incomingUpdatedAt ?? 'unknown'})`
)
console.log(`📂 Existing: ${existingData.length} tweets`)

// ── MERGE & DEDUPLICATE ──────────────────────────────────────────────────────

// Index existing tweets by ID for O(1) lookup
const byId = new Map(existingData.map((t) => [t.id, t]))

let added = 0
let updated = 0

for (const tweet of incoming) {
  if (!tweet.id) continue

  if (!byId.has(tweet.id)) {
    byId.set(tweet.id, tweet)
    added++
  } else {
    // Incoming data is fresher (updated engagement counts etc.) — overwrite
    byId.set(tweet.id, tweet)
    updated++
  }
}

// ── SORT & SAVE ──────────────────────────────────────────────────────────────

// Pinned tweets always first, then newest-first by date
const mergedData = [...byId.values()].sort((a, b) => {
  if (a.isPinned && !b.isPinned) return -1
  if (!a.isPinned && b.isPinned) return 1
  return new Date(b.date) - new Date(a.date)
})

const output = {
  updatedAt: incomingUpdatedAt ?? new Date().toISOString(),
  data: mergedData,
}

writeFileSync(BASE_PATH, JSON.stringify(output, null, 2))

console.log(`\n✅ Merge complete!`)
console.log(`   ➕ Added:   ${added} new tweets`)
console.log(
  `   🔄 Updated: ${updated - added < 0 ? 0 : updated - added} existing tweets`
)
console.log(`   📊 Total:   ${mergedData.length} tweets in ${BASE_PATH}`)
console.log(`\n🧹 You can now delete or clear ${NEW_PATH}`)
console.log(`🚀 Ready to commit & push!`)
