#!/usr/bin/env node
// Usage: node diff_stars.mjs <assignments.json> <stars_now.jsonl>
// Prints {counts, new:[{n,d,l,t}], removed:[names]} — new = starred but not in ledger.
import { readFileSync } from 'node:fs'

const [ledgerPath, starsPath] = process.argv.slice(2)
if (!ledgerPath || !starsPath) {
  console.error('usage: node diff_stars.mjs <assignments.json> <stars_now.jsonl>')
  process.exit(1)
}

const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
const stars = readFileSync(starsPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line))

const current = new Set(stars.map((s) => s.n))
const meta = Object.fromEntries(stars.map((s) => [s.n, s]))

const added = [...current].filter((n) => ledger[n] === undefined).map((n) => meta[n])
const removed = Object.keys(ledger).filter((n) => !current.has(n))

console.log(
  JSON.stringify(
    {
      counts: {
        stars: current.size,
        ledger: Object.keys(ledger).length,
        new: added.length,
        removed: removed.length,
      },
      new: added,
      removed,
    },
    null,
    1
  )
)
