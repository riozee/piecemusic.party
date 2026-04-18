#!/usr/bin/env node

/**
 * manage-codes.js — Interactive CLI for pulling / pushing passcodes
 * from/to the Cloudflare D1 "piecemusic" database.
 *
 * Usage:   node manage-codes/manage-codes.js
 * Requires: npx wrangler available in PATH
 *
 * Safety notes:
 * - push uses UPSERT (ON CONFLICT) instead of INSERT OR REPLACE to preserve
 *   columns not present in the CSV (e.g. future usage counters).
 * - is_suspended is NEVER overwritten by push to prevent accidentally
 *   re-enabling auto-suspended codes when pushing stale CSV data.
 * - pull paginates with LIMIT/OFFSET for large datasets.
 * - push chunks SQL statements in batches of 200 to stay within D1 limits.
 */

import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_NAME = 'piecemusic'
const CSV_PATH = resolve(__dirname, 'passcodes.csv')

/** Number of rows per page when pulling from D1. */
const PULL_PAGE_SIZE = 500
/** Number of SQL statements per batch when pushing to D1. */
const PUSH_BATCH_SIZE = 200

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

/** Run a shell command and return stdout. */
function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
}

function csvEscape(val) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

/** Minimal RFC 4180-ish CSV line parser. */
function parseCsvLine(line) {
  const result = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
  }
  result.push(cur)
  return result
}

// ---------------------------------------------------------------------------
// PULL: D1 → CSV (paginated)
// ---------------------------------------------------------------------------

function pull() {
  console.log('\n⏳ Pulling passcodes from remote D1…')

  const cols = [
    'code',
    'album_id',
    'issued_at',
    'valid_duration',
    'is_suspended',
  ]

  const allRows = []
  let offset = 0

  // Paginate to avoid buffer / payload limits on large tables
  while (true) {
    const raw = run(
      `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT * FROM passcodes LIMIT ${PULL_PAGE_SIZE} OFFSET ${offset}" --json`
    )

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      console.error('❌ Failed to parse wrangler output:', e.message)
      return
    }

    const rows = parsed?.[0]?.results ?? []
    allRows.push(...rows)

    if (rows.length < PULL_PAGE_SIZE) break // last page
    offset += PULL_PAGE_SIZE
    console.log(`   …fetched ${allRows.length} rows so far`)
  }

  if (allRows.length === 0) {
    console.log('ℹ️  No rows found. Writing empty CSV header.')
  }

  const lines = [cols.join(',')]
  for (const row of allRows) {
    lines.push(cols.map((c) => csvEscape(String(row[c] ?? ''))).join(','))
  }

  writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf-8')
  console.log(`✅ Saved ${allRows.length} row(s) → ${CSV_PATH}`)
}

// ---------------------------------------------------------------------------
// PUSH: CSV → D1 (UPSERT, is_suspended protected, chunked)
// ---------------------------------------------------------------------------

function push() {
  if (!existsSync(CSV_PATH)) {
    console.error(
      `❌ CSV file not found at ${CSV_PATH}. Run pull first or create it.`
    )
    return
  }

  console.log('\n⏳ Pushing passcodes to remote D1…')

  const content = readFileSync(CSV_PATH, 'utf-8').trim()
  const [headerLine, ...dataLines] = content.split('\n')

  if (dataLines.length === 0) {
    console.log('ℹ️  No data rows in CSV. Nothing to push.')
    return
  }

  const headers = parseCsvLine(headerLine)

  // Columns that are safe to update on conflict — is_suspended is excluded
  // so that server-side auto-suspensions are never overwritten by stale CSV.
  const updateCols = headers.filter((h) => h !== 'code' && h !== 'is_suspended')

  const statements = []
  let skipped = 0
  for (const line of dataLines) {
    if (!line.trim()) continue
    const vals = parseCsvLine(line)

    // Validate values before interpolating into SQL
    const code = vals[headers.indexOf('code')] ?? ''
    const albumId = vals[headers.indexOf('album_id')] ?? ''
    if (!code || /[^a-zA-Z0-9_\-]/.test(code)) {
      console.warn(`⚠️  Skipping invalid code: "${code}"`)
      skipped++
      continue
    }
    if (!albumId || /[^a-zA-Z0-9_\-]/.test(albumId)) {
      console.warn(`⚠️  Skipping invalid album_id: "${albumId}"`)
      skipped++
      continue
    }

    const sqlVals = headers.map((h, i) => {
      const v = vals[i] ?? ''
      if (['issued_at', 'valid_duration', 'is_suspended'].includes(h)) {
        const num = Number(v)
        if (!Number.isFinite(num) || num < 0) return 0
        return Math.floor(num)
      }
      return `'${v.replace(/'/g, "''")}'`
    })

    // UPSERT: insert new rows, update existing rows without touching is_suspended.
    // This prevents future columns (e.g. usage_count) from being lost, and
    // prevents accidentally re-enabling suspended codes from stale CSVs.
    const setClause = updateCols
      .map((col) => `${col} = excluded.${col}`)
      .join(', ')

    statements.push(
      `INSERT INTO passcodes (${headers.join(', ')}) VALUES (${sqlVals.join(', ')}) ON CONFLICT(code) DO UPDATE SET ${setClause};`
    )
  }

  // Push in batches to stay within D1 payload limits
  const tmpPath = resolve(__dirname, '_tmp_push.sql')
  let pushed = 0

  try {
    for (let i = 0; i < statements.length; i += PUSH_BATCH_SIZE) {
      const batch = statements.slice(i, i + PUSH_BATCH_SIZE)
      writeFileSync(tmpPath, batch.join('\n'), 'utf-8')
      run(`npx wrangler d1 execute ${DB_NAME} --remote --file="${tmpPath}"`)
      pushed += batch.length
      if (statements.length > PUSH_BATCH_SIZE) {
        console.log(`   …pushed ${pushed} / ${statements.length} rows`)
      }
    }
    console.log(`✅ Pushed ${pushed} row(s) to remote D1.`)
    if (skipped > 0) {
      console.log(`⚠️  Skipped ${skipped} row(s) with invalid data.`)
    }
  } catch (e) {
    console.error(`❌ Push failed after ${pushed} rows:`, e.message)
  } finally {
    if (existsSync(tmpPath)) unlinkSync(tmpPath)
  }
}

// ---------------------------------------------------------------------------
// Menu loop
// ---------------------------------------------------------------------------

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  console.log('\n🔑 Piece Music — Passcode Manager')
  console.log('──────────────────────────────────')

  let running = true
  while (running) {
    const choice = (await ask(rl, '\n[pull / push / exit] > '))
      .trim()
      .toLowerCase()

    switch (choice) {
      case 'pull':
        pull()
        break
      case 'push':
        push()
        break
      case 'exit':
      case 'q':
        running = false
        break
      default:
        console.log('❓ Unknown command. Type pull, push, or exit.')
    }
  }

  rl.close()
  console.log('👋 Bye!')
}

main()
