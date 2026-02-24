/**
 * ============================================================================
 * X (TWITTER) BROWSER CONSOLE SCRAPER
 * ============================================================================
 *
 * ── WORKFLOW (PASTE → COPY → MERGE → PUSH) ──────────────────────────────
 *
 *  1. PASTE  — Copy this entire file and paste it into the browser DevTools
 *              Console (F12 → Console tab) while on the X profile page.
 *              A floating "⏹ Stop & Copy" button will appear on the page.
 *
 *  2. COPY   — The script auto-scrolls and collects tweets. Click the button
 *              whenever you want to stop (e.g. once you see tweets you already
 *              have). Results are automatically copied to your clipboard.
 *              The script also stops by itself at the end of the page.
 *
 *  3. MERGE  — Create (or overwrite) `x-scraper/tweets.json` in the project
 *              root and paste the clipboard into it. Then run:
 *                  node x-scraper/merge-tweets.js
 *              This merges the new tweets into `public/tweets.json`,
 *              deduplicates by tweet ID, and sorts newest-first.
 *
 *  4. PUSH   — Commit and push. The site will reflect the new tweets.
 *
 * NOTE: tweets.json in the root is gitignored — it's a temp paste file only.
 * ============================================================================
 */

;(async () => {
  // ── CONFIG ────────────────────────────────────────────────────────────────
  const SCROLL_STEP = 800 // pixels scrolled per tick
  const SCROLL_DELAY = 1800 // ms to wait after each scroll (increase on slow connections)
  const MAX_EMPTY_SCROLLS = 8 // consecutive empty scrolls before auto-stop
  // ─────────────────────────────────────────────────────────────────────────

  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  const seen = new Set() // deduplicate by tweet URL
  const results = []
  let stopRequested = false

  // ── STOP BUTTON UI ────────────────────────────────────────────────────────

  const btn = document.createElement('button')
  btn.id = '__tweet_scraper_stop_btn'
  btn.textContent = '⏹ Stop & Copy'
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    padding: '12px 20px',
    background: '#1d9bf0',
    color: '#fff',
    border: 'none',
    borderRadius: '9999px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: '1',
  })

  // Counter badge inside the button
  const updateBtn = (count) => {
    btn.textContent = `⏹ Stop & Copy (${count})`
  }

  btn.addEventListener('click', () => {
    stopRequested = true
    btn.textContent = '⏳ Stopping...'
    btn.style.background = '#536471'
    btn.style.cursor = 'default'
  })

  document.body.appendChild(btn)

  // ── HELPERS ───────────────────────────────────────────────────────────────

  // ── HELPERS ───────────────────────────────────────────────────────────────

  /**
   * Reconstruct tweet text by walking the tweetText DOM tree.
   * For <a href="https://..."> links (t.co URLs), we emit the actual href
   * instead of the truncated display text that X shows (e.g. "example.com/…").
   * Hashtags and @mentions keep their display text since those are already correct.
   */
  function richCleanText(tweetTextEl) {
    if (!tweetTextEl) return null

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent
      if (node.nodeName === 'BR') return '\n'
      if (node.nodeName === 'IMG') {
        // Inline emoji images — use alt text (the actual emoji character)
        return node.getAttribute('alt') || ''
      }
      if (node.nodeName === 'A') {
        const href = node.getAttribute('href') || ''
        // External URL (t.co redirect or direct link):
        // keep the clamped display text AND append the t.co href so the
        // renderer can pair "example.com/path…" → href="https://t.co/xxx"
        if (href.startsWith('http://') || href.startsWith('https://')) {
          const displayText = Array.from(node.childNodes).map(walk).join('')
          return displayText + ' ' + href
        }
        // /hashtag/... or /username → keep display text (#tag, @handle)
      }
      // Recurse into all other elements (span, div, etc.)
      return Array.from(node.childNodes).map(walk).join('')
    }

    return walk(tweetTextEl)
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  /** Upgrade a pbs.twimg.com image URL from _small/_normal/_x96 → orig */
  function upgradeImgUrl(url) {
    if (!url) return null
    // Replace quality suffixes with 'orig' for full resolution
    return (
      url
        .replace(/[?&]name=\w+/, '') // remove existing name param
        .replace(
          /(_normal|_mini|_x96|_200x200|_400x400|_bigger)(\.\w+)$/,
          '$2'
        ) + // strip size suffix from filename
      (url.includes('?') ? '&name=orig' : '?name=orig')
    )
  }

  /** Extract all image URLs from a tweet node */
  function extractImages(tweetEl) {
    const imgs = []
    tweetEl
      .querySelectorAll('[data-testid="tweetPhoto"] img')
      .forEach((img) => {
        const src = img.getAttribute('src')
        if (src) imgs.push(upgradeImgUrl(src))
      })
    return imgs.length ? imgs : null
  }

  /** Extract engagement counts from the aria-label on the role="group" element */
  function extractEngagement(tweetEl) {
    const group = tweetEl.querySelector('[role="group"][aria-label]')
    if (!group)
      return { replies: 0, reposts: 0, likes: 0, views: 0, bookmarks: 0 }
    const label = group.getAttribute('aria-label')
    const num = (re) => {
      const m = label.match(re)
      return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0
    }
    return {
      replies: num(/(\d[\d,]*)\s*件の返信/),
      reposts: num(/(\d[\d,]*)\s*件のリポスト/),
      likes: num(/(\d[\d,]*)\s*件のいいね/),
      views: num(/(\d[\d,]*)\s*件の表示/),
      bookmarks: num(/(\d[\d,]*)\s*件のブックマーク/),
    }
  }

  /** Extract a "reposted by" or "pinned" social context label above the tweet */
  function extractSocialContext(tweetEl) {
    const ctx = tweetEl.querySelector('[data-testid="socialContext"]')
    return ctx ? ctx.innerText.trim() : null
  }

  /** Extract the tweet author (handles cases where it's someone else's repost) */
  function extractAuthor(tweetEl) {
    const userNameEl = tweetEl.querySelector('[data-testid="User-Name"]')
    if (!userNameEl) return null

    // Display name: first <a> inside User-Name that links to a profile
    const displayNameEl = userNameEl.querySelector('a[href^="/"] span span')
    const displayName = displayNameEl ? displayNameEl.innerText.trim() : null

    // Handle: look for the @handle link (second <a> or the one with @)
    let handle = null
    userNameEl.querySelectorAll('a[href^="/"]').forEach((a) => {
      const span = a.querySelector('span')
      if (span && span.innerText.trim().startsWith('@')) {
        handle = span.innerText.trim()
      }
    })

    return { displayName, handle }
  }

  /** Extract avatar URL for the tweet author */
  function extractAvatar(tweetEl) {
    const avatarContainer = tweetEl.querySelector(
      '[data-testid^="UserAvatar-Container-"]'
    )
    if (!avatarContainer) return null
    const img = avatarContainer.querySelector('img')
    return img ? upgradeImgUrl(img.getAttribute('src')) : null
  }

  /** Extract tweet URL and ID from the <time> parent anchor */
  function extractTweetUrl(tweetEl) {
    const timeEl = tweetEl.querySelector('time[datetime]')
    if (!timeEl) return { url: null, id: null }
    const anchor = timeEl.closest('a[href*="/status/"]')
    if (!anchor) return { url: null, id: null }
    const href = anchor.getAttribute('href') // e.g. /Piece_Music_/status/12345
    const url = 'https://x.com' + href
    const id = href.split('/status/')[1]?.split('/')[0] || null
    return { url, id }
  }

  /** Extract video/card thumbnail if present (for link cards or video tweets) */
  function extractCard(tweetEl) {
    const cardImg = tweetEl.querySelector(
      '[data-testid="card.layoutSmall.media"] img, [data-testid="card.layoutLarge.media"] img'
    )
    if (!cardImg) return null
    const src = cardImg.getAttribute('src')
    const titleEl = tweetEl.querySelector(
      '[data-testid="card.layoutSmall.detail"] span, [data-testid="card.layoutLarge.detail"] span'
    )
    return {
      thumbnailUrl: src ? upgradeImgUrl(src) : null,
      title: titleEl ? titleEl.innerText.trim() : null,
    }
  }

  // ── MAIN EXTRACTION LOOP ──────────────────────────────────────────────────

  function extractVisible() {
    let added = 0
    document.querySelectorAll('[data-testid="tweet"]').forEach((tweetEl) => {
      const { url, id } = extractTweetUrl(tweetEl)
      if (!url || seen.has(url)) return

      const textEl = tweetEl.querySelector('[data-testid="tweetText"]')
      // Use richCleanText to capture real URLs instead of X's truncated display text
      const text = richCleanText(textEl)
      const dateEl = tweetEl.querySelector('time[datetime]')
      const date = dateEl ? dateEl.getAttribute('datetime') : null

      // Skip if no date (likely a UI shell, not a real tweet)
      if (!date) return

      const socialCtx = extractSocialContext(tweetEl)
      const isPinned = !!(socialCtx && socialCtx.includes('固定'))
      const isRepost = !!(socialCtx && socialCtx.includes('リポスト'))

      seen.add(url)
      added++

      results.push({
        id,
        url,
        date,
        text,
        author: extractAuthor(tweetEl),
        avatarUrl: extractAvatar(tweetEl),
        images: extractImages(tweetEl),
        card: extractCard(tweetEl),
        engagement: extractEngagement(tweetEl),
        socialContext: socialCtx,
        isRepost,
        isPinned,
      })
    })
    return added
  }

  // ── FINISH: copy results and remove button ────────────────────────────────

  function finish(reason) {
    // Pinned tweets first, then newest-first by date
    results.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.date) - new Date(a.date)
    })

    const output = {
      updatedAt: new Date().toISOString(), // timestamp of when this scrape ran
      data: results,
    }

    btn.remove()
    console.log(`\n${reason}`)
    console.log(`✅ Extracted ${results.length} unique tweets.`)
    console.log(
      '📋 Copy the JSON below, paste into x-scraper/tweets.json, then run:'
    )
    console.log('   node x-scraper/merge-tweets.js\n')
    console.log(output)
  }

  // ── SCROLL LOOP ───────────────────────────────────────────────────────────

  console.log('🚀 Starting tweet extraction. Scrolling to top first...')
  console.log('   Click the ⏹ button on the page to stop at any time.')
  window.scrollTo(0, 0)
  await delay(1500)

  let emptyScrolls = 0

  while (emptyScrolls < MAX_EMPTY_SCROLLS) {
    // User clicked stop
    if (stopRequested) {
      finish('⏹ Stopped by user.')
      return results
    }

    const added = extractVisible()
    updateBtn(results.length)

    if (added === 0) {
      emptyScrolls++
    } else {
      emptyScrolls = 0
    }

    if (results.length > 0) {
      console.log(`📦 ${results.length} tweets collected...`)
    }

    // Check if we've reached the bottom of the page
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 100

    if (atBottom && emptyScrolls >= 2) {
      finish('📄 Reached the end of the page.')
      return results
    }

    window.scrollBy(0, SCROLL_STEP)
    await delay(SCROLL_DELAY)
  }

  finish('🔚 No new tweets found after several scrolls.')
  return results
})()
