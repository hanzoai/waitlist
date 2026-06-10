#!/usr/bin/env node
// Reference implementation of the /v1/waitlist/* contract.
//
// Mirrors the Hanzo Base plugin at ~/work/hanzo/base/plugins/waitlist
// byte-for-byte on the wire format. In-memory only — restart drops state.
// Used by the demo and serves as an executable spec for anyone reimplementing
// the contract.
//
// Run:
//   PORT=8090 node server.js
//
// Endpoints:
//   POST /v1/waitlist/join      { waitlist, email, referrerCode?, turnstileToken? }
//   GET  /v1/waitlist/status?waitlist=&email=
//   GET  /v1/waitlist/export?waitlist=    (Bearer auth via WAITLIST_ADMIN_SECRET)

import http from 'node:http'
import crypto from 'node:crypto'

const PORT = Number(process.env.PORT ?? 8090)
const ADMIN_SECRET = process.env.WAITLIST_ADMIN_SECRET ?? ''
const RATE_LIMIT = Number(process.env.WAITLIST_RATE_LIMIT ?? 5)
const RATE_WINDOW_MS = 60 * 60 * 1000

const REF_ALPHABET = '6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz'
const DISPOSABLE = new Set([
  'tempmail.com','guerrillamail.com','10minutemail.com','mailinator.com',
  'trashmail.com','getairmail.com','yopmail.com','maildrop.cc',
  'throwaway.email','fakeinbox.com',
])

// In-memory store: slug -> { entries: Map<email, Entry> }
const lists = new Map()
function listOf(slug) {
  let l = lists.get(slug)
  if (!l) {
    l = { entries: new Map() }
    lists.set(slug, l)
  }
  return l
}

// Sliding-window rate limit keyed by IP.
const hits = new Map()
function allow(key) {
  if (RATE_LIMIT <= 0) return true
  const now = Date.now()
  const cutoff = now - RATE_WINDOW_MS
  const arr = (hits.get(key) || []).filter((t) => t > cutoff)
  if (arr.length >= RATE_LIMIT) {
    hits.set(key, arr)
    return false
  }
  arr.push(now)
  hits.set(key, arr)
  return true
}

function genRefCode() {
  const bytes = crypto.randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) out += REF_ALPHABET[bytes[i] % REF_ALPHABET.length]
  return out
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isValidEmail(s) { return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s) }
function domain(email) { const i = email.lastIndexOf('@'); return i < 0 ? '' : email.slice(i+1).toLowerCase() }

function computeRank(list, entry) {
  const all = [...list.entries.values()]
  const total = all.length
  // Sort: referralCount DESC, createdAt ASC
  all.sort((a, b) => b.referralCount - a.referralCount || a.createdAt - b.createdAt)
  const rank = all.findIndex((e) => e.email === entry.email) + 1
  return { rank, total }
}

function entryToJoinResponse(list, entry, alreadyJoined) {
  const { rank, total } = computeRank(list, entry)
  return {
    ok: true,
    waitlist: entry.waitlist,
    email: entry.email,
    refCode: entry.refCode,
    rank,
    total,
    referralCount: entry.referralCount,
    shareUrl: `?ref=${entry.refCode}`,
    ...(alreadyJoined ? { alreadyJoined: true } : {}),
  }
}

function entryToStatusResponse(list, entry) {
  const { rank, total } = computeRank(list, entry)
  return {
    ok: true,
    waitlist: entry.waitlist,
    email: entry.email,
    refCode: entry.refCode,
    rank,
    total,
    aheadOf: Math.max(0, total - rank),
    referralCount: entry.referralCount,
    shareUrl: `?ref=${entry.refCode}`,
  }
}

// --- HTTP helpers ----------------------------------------------------------

function send(res, status, body, headers = {}) {
  const isString = typeof body === 'string'
  res.writeHead(status, {
    'Content-Type': isString ? 'text/plain; charset=utf-8' : 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    ...headers,
  })
  res.end(isString ? body : JSON.stringify(body))
}

function err(res, status, message, data) {
  send(res, status, { status, message, data })
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function clientIp(req) {
  return (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()
    || req.socket.remoteAddress
    || 'unknown')
}

// --- Handlers --------------------------------------------------------------

async function handleJoin(req, res) {
  let body
  try { body = await readJson(req) } catch { return err(res, 400, 'invalid json') }

  const slug = (body.waitlist || '').toString().trim()
  const email = (body.email || '').toString().trim().toLowerCase()
  const referrerCode = (body.referrerCode || '').toString().trim()

  if (!slug || !email) return err(res, 400, 'waitlist and email are required')
  if (!isValidEmail(email)) return err(res, 400, 'invalid email')
  if (DISPOSABLE.has(domain(email))) return err(res, 400, 'disposable email not allowed')

  const ip = clientIp(req)
  if (!allow(`join:${ip}`)) return err(res, 429, 'rate limit exceeded')

  // Turnstile is a no-op in the mock — host-side concern.

  const list = listOf(slug)
  const existing = list.entries.get(email)
  if (existing) return send(res, 200, entryToJoinResponse(list, existing, true))

  // Credit referrer (if any, and not self-ref).
  if (referrerCode) {
    for (const e of list.entries.values()) {
      if (e.refCode === referrerCode && e.email !== email) {
        e.referralCount += 1
        break
      }
    }
  }

  // Allocate unique refCode.
  let refCode
  for (let i = 0; i < 8; i++) {
    const cand = genRefCode()
    if (![...list.entries.values()].some((e) => e.refCode === cand)) { refCode = cand; break }
  }
  if (!refCode) return err(res, 500, 'failed to allocate refCode')

  const entry = {
    waitlist: slug,
    email,
    refCode,
    referredBy: referrerCode || '',
    referralCount: 0,
    createdAt: Date.now(),
  }
  list.entries.set(email, entry)
  return send(res, 200, entryToJoinResponse(list, entry, false))
}

function handleStatus(req, url, res) {
  const slug = (url.searchParams.get('waitlist') || '').trim()
  const email = (url.searchParams.get('email') || '').trim().toLowerCase()
  if (!slug || !email) return err(res, 400, 'waitlist and email are required')
  const list = lists.get(slug)
  if (!list) return err(res, 404, 'waitlist not found')
  const entry = list.entries.get(email)
  if (!entry) return err(res, 404, 'entry not found')
  return send(res, 200, entryToStatusResponse(list, entry))
}

function handleExport(req, url, res) {
  const auth = req.headers['authorization'] || ''
  if (!ADMIN_SECRET || auth !== `Bearer ${ADMIN_SECRET}`) {
    return err(res, 401, 'admin auth required')
  }
  const slug = (url.searchParams.get('waitlist') || '').trim()
  if (!slug) return err(res, 400, 'waitlist is required')
  const list = lists.get(slug)
  if (!list) return err(res, 404, 'waitlist not found')

  const rows = [...list.entries.values()].sort(
    (a, b) => b.referralCount - a.referralCount || a.createdAt - b.createdAt
  )
  const lines = ['rank,email,refCode,referredBy,referralCount,createdAt']
  rows.forEach((e, i) => {
    lines.push([
      i + 1,
      e.email,
      e.refCode,
      e.referredBy,
      e.referralCount,
      new Date(e.createdAt).toISOString(),
    ].join(','))
  })
  send(res, 200, lines.join('\n'), {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="waitlist-${slug}-${Date.now()}.csv"`,
  })
}

// --- Server ---------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '')

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (url.pathname === '/healthz') return send(res, 200, 'ok')

  try {
    if (req.method === 'POST' && url.pathname === '/v1/waitlist/join') return await handleJoin(req, res)
    if (req.method === 'GET'  && url.pathname === '/v1/waitlist/status') return handleStatus(req, url, res)
    if (req.method === 'GET'  && url.pathname === '/v1/waitlist/export') return handleExport(req, url, res)
  } catch (e) {
    console.error('[mock-api]', e)
    return err(res, 500, 'internal error')
  }

  err(res, 404, 'not found')
})

server.listen(PORT, () => {
  console.log(`[mock-api] /v1/waitlist/* on http://localhost:${PORT}`)
  if (!ADMIN_SECRET) console.log('[mock-api] WAITLIST_ADMIN_SECRET unset — /v1/waitlist/export disabled')
})
