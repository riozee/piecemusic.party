#!/usr/bin/env node

/**
 * manage-codes.js — Interactive CLI for pulling / pushing passcodes
 * from/to the Cloudflare D1 "piecemusic" database.
 *
 * Usage:   node manage-codes/manage-codes.js
 * Requires: npx wrangler available in PATH
 */

import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_NAME = 'piecemusic'
const CSV_PATH = resolve(__dirname, 'passcodes.csv')

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

// ---------------------------------------------------------------------------
// PULL: D1 → CSV
// ---------------------------------------------------------------------------

function pull() {
  console.log('\n⏳ Pulling passcodes from remote D1…')

  const raw = run(
    `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT * FROM passcodes" --json`
  )

  // wrangler --json wraps results in an array of result objects
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    console.error('❌ Failed to parse wrangler output:', e.message)
    return
  }

  const rows = parsed?.[0]?.results ?? []

  if (rows.length === 0) {
    console.log('ℹ️  No rows found. Writing empty CSV header.')
  }

  const cols = [
    'code',
    'album_id',
    'issued_at',
    'valid_duration',
    'is_suspended',
  ]
  const lines = [cols.join(',')]

  for (const row of rows) {
    lines.push(cols.map((c) => csvEscape(String(row[c] ?? ''))).join(','))
  }

  writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf-8')
  console.log(`✅ Saved ${rows.length} row(s) → ${CSV_PATH}`)
}

function csvEscape(val) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

// ---------------------------------------------------------------------------
// PUSH: CSV → D1
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

  const statements = []
  for (const line of dataLines) {
    if (!line.trim()) continue
    const vals = parseCsvLine(line)
    const sqlVals = headers.map((h, i) => {
      const v = vals[i] ?? ''
      // Numeric columns
      if (['issued_at', 'valid_duration', 'is_suspended'].includes(h)) {
        return Number(v) || 0
      }
      return `'${v.replace(/'/g, "''")}'`
    })
    statements.push(
      `INSERT OR REPLACE INTO passcodes (${headers.join(', ')}) VALUES (${sqlVals.join(', ')});`
    )
  }

  const sql = statements.join('\n')
  const tmpPath = resolve(__dirname, '_tmp_push.sql')
  writeFileSync(tmpPath, sql, 'utf-8')

  try {
    run(`npx wrangler d1 execute ${DB_NAME} --remote --file="${tmpPath}"`)
    console.log(`✅ Pushed ${dataLines.length} row(s) to remote D1.`)
  } catch (e) {
    console.error('❌ Push failed:', e.message)
  } finally {
    if (existsSync(tmpPath)) unlinkSync(tmpPath)
  }
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
