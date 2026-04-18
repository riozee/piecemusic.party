/**
 * IP-tracking logic for passcode abuse prevention.
 *
 * Two-tier system:
 *   Tier 2 (soft cap, ≥5 IPs)  – reject request, do not suspend code
 *   Tier 1 (hard cap, ≥15 IPs) – auto-suspend the passcode
 *
 * IPs older than 6 hours are pruned asynchronously on every new-IP insert.
 */

import { json } from './_helpers'
import { ERR } from './_errors'

/** Hours after which idle IPs are pruned from the tracking table. */
const PRUNE_AGE_S = 6 * 3600 // 21 600 s

/** Tier-2 soft cap: reject but don't suspend. */
const SOFT_CAP = 5

/** Tier-1 hard cap: auto-suspend the passcode. */
const HARD_CAP = 15

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

type IpCheckResult =
  /** IP is allowed — proceed to issue session. */
  | { ok: true }
  /** IP is blocked — return the pre-built Response to the client. */
  | { ok: false; response: Response }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate whether the given IP is allowed for this passcode.
 *
 * Side-effects (run via `context.waitUntil`):
 * - INSERT / UPDATE the ip_tracking row for this IP.
 * - Prune stale rows (> 6 h) scoped to this code.
 *
 * @returns `{ ok: true }` when the request may proceed, or
 *          `{ ok: false, response }` with a ready-to-return error response.
 */
export async function checkIpLimit(
  code: string,
  ip: string,
  now: number,
  env: { DB: D1Database },
  waitUntil: (p: Promise<unknown>) => void
): Promise<IpCheckResult> {
  // Is this IP already known for this code?
  const existingIp = await env.DB.prepare(
    'SELECT 1 FROM ip_tracking WHERE code = ? AND ip = ?'
  )
    .bind(code, ip)
    .first()

  if (existingIp) {
    // Known IP — refresh last_seen so the prune window stays current.
    waitUntil(refreshLastSeen(env.DB, code, ip, now))
    return { ok: true }
  }

  // ---------- New IP ----------

  const countResult = await env.DB.prepare(
    'SELECT COUNT(DISTINCT ip) AS cnt FROM ip_tracking WHERE code = ?'
  )
    .bind(code)
    .first<{ cnt: number }>()

  const distinctIps = countResult?.cnt ?? 0

  // Record *before* evaluating thresholds so a Tier-2 early-return still
  // increments the counter toward the Tier-1 hard cap.
  waitUntil(insertAndPrune(env.DB, code, ip, now))

  const currentTotalIps = distinctIps + 1

  // Tier 1: hard cap — auto-suspend
  if (currentTotalIps >= HARD_CAP) {
    await env.DB.prepare('UPDATE passcodes SET is_suspended = 1 WHERE code = ?')
      .bind(code)
      .run()
    return { ok: false, response: json({ error: ERR.IP_HARD_CAP }, 403) }
  }

  // Tier 2: soft cap — reject without suspending
  if (currentTotalIps >= SOFT_CAP) {
    return { ok: false, response: json({ error: ERR.IP_SOFT_CAP }, 429) }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Internal async tasks (executed via waitUntil)
// ---------------------------------------------------------------------------

async function insertAndPrune(
  db: D1Database,
  code: string,
  ip: string,
  now: number
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO ip_tracking (code, ip, first_seen, last_seen)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(code, ip) DO UPDATE SET last_seen = excluded.last_seen`
      )
      .bind(code, ip, now, now)
      .run()

    // Prune IPs older than 6 hours — scoped to current code
    await db
      .prepare('DELETE FROM ip_tracking WHERE code = ? AND last_seen < ?')
      .bind(code, now - PRUNE_AGE_S)
      .run()
  } catch (err) {
    console.error('[ip-tracking] insert/prune failed:', err)
  }
}

async function refreshLastSeen(
  db: D1Database,
  code: string,
  ip: string,
  now: number
): Promise<void> {
  try {
    await db
      .prepare('UPDATE ip_tracking SET last_seen = ? WHERE code = ? AND ip = ?')
      .bind(now, code, ip)
      .run()
  } catch (err) {
    console.error('[ip-tracking] last_seen refresh failed:', err)
  }
}
