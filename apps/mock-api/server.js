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
//   POST /v1/waitlist/join         { waitlist, email, referrerCode?, turnstileToken? }
//   GET  /v1/waitlist/status?waitlist=&email=
//   GET  /v1/waitlist/list?waitlist=&page=&pageSize=
//   GET  /v1/waitlist/activity?waitlist=&limit=&types=
//   POST /v1/waitlist/track-share  { waitlist, refCode, platform }
//   POST /v1/waitlist/invite       { waitlist, refCode, emails: [...], message? }
//   GET  /v1/waitlist/export?waitlist=    (Bearer auth via WAITLIST_ADMIN_SECRET)
//
// Points engine:
//   • each entry has `points` and a per-source breakdown
//   • referral (someone joins via your refCode): POINTS_REFERRAL (default 10)
//   • share-action click (per platform per day): POINTS_SHARE (default 2)
//   • invite-sent (per valid email submitted): POINTS_INVITE_SENT (default 1)
//   • invited friend joins: POINTS_INVITE_CONVERTED (default 5)
//   Leaderboard sorts by points DESC, createdAt ASC.

import http from 'node:http'
import crypto from 'node:crypto'

const PORT = Number(process.env.PORT ?? 8090)
const ADMIN_SECRET = process.env.WAITLIST_ADMIN_SECRET ?? ''
const RATE_LIMIT = Number(process.env.WAITLIST_RATE_LIMIT ?? 5)
const RATE_WINDOW_MS = 60 * 60 * 1000

// Point values — overridable via env so each consumer can tune.
const POINTS = {
  REFERRAL:          Number(process.env.POINTS_REFERRAL ?? 10),
  SHARE:             Number(process.env.POINTS_SHARE ?? 2),
  INVITE_SENT:       Number(process.env.POINTS_INVITE_SENT ?? 1),
  INVITE_CONVERTED:  Number(process.env.POINTS_INVITE_CONVERTED ?? 5),
}
const INVITE_MAX_BATCH = Number(process.env.WAITLIST_INVITE_MAX ?? 50)
const ACTIVITY_MAX_HISTORY = Number(process.env.ACTIVITY_MAX_HISTORY ?? 200)
const ACTIVITY_LIMIT_CAP = Number(process.env.ACTIVITY_LIMIT_CAP ?? 100)
const ACTIVITY_TYPES = new Set(['join', 'share', 'invite', 'referral'])
const SHARE_PLATFORMS = new Set([
  'webshare','email','x','twitter','linkedin','facebook',
  'reddit','telegram','whatsapp','sms','copy','mastodon','bluesky','threads',
])

const REF_ALPHABET = '6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz'
const DISPOSABLE = new Set([
  'tempmail.com','guerrillamail.com','10minutemail.com','mailinator.com',
  'trashmail.com','getairmail.com','yopmail.com','maildrop.cc',
  'throwaway.email','fakeinbox.com',
])

// In-memory store: slug -> { entries: Map<email, Entry>, activity: [Event...] }
const lists = new Map()
function listOf(slug) {
  let l = lists.get(slug)
  if (!l) {
    l = { entries: new Map(), activity: [] }
    lists.set(slug, l)
  }
  if (!l.activity) l.activity = []
  return l
}

// Push an event; ring-buffer to ACTIVITY_MAX_HISTORY.
function pushActivity(list, evt) {
  list.activity.push({ ts: Date.now(), ...evt })
  if (list.activity.length > ACTIVITY_MAX_HISTORY) {
    list.activity.splice(0, list.activity.length - ACTIVITY_MAX_HISTORY)
  }
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

function totalPoints(entry) {
  return (entry.pointBreakdown.referrals
    + entry.pointBreakdown.shares
    + entry.pointBreakdown.invitesSent
    + entry.pointBreakdown.invitesConverted)
}

function computeRank(list, entry) {
  const all = [...list.entries.values()]
  const total = all.length
  // Sort: points DESC, createdAt ASC (earlier joiners break ties)
  all.sort((a, b) => totalPoints(b) - totalPoints(a) || a.createdAt - b.createdAt)
  const rank = all.findIndex((e) => e.email === entry.email) + 1
  return { rank, total }
}

function findEntryByRefCode(list, refCode) {
  for (const e of list.entries.values()) {
    if (e.refCode === refCode) return e
  }
  return null
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
    points: totalPoints(entry),
    pointBreakdown: { ...entry.pointBreakdown },
    pointValues: { ...POINTS },
    referralCount: entry.referralCount,
    shareUrl: `?ref=${entry.refCode}`,
    ...(alreadyJoined ? { alreadyJoined: true } : {}),
  }
}

// Mask local-part of email for non-admin views: alice@example.com -> a***e@example.com.
function maskEmail(email) {
  const at = email.indexOf('@')
  if (at < 2) return '*'.repeat(Math.max(1, at)) + email.slice(at)
  const local = email.slice(0, at)
  return local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1] + email.slice(at)
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
    points: totalPoints(entry),
    pointBreakdown: { ...entry.pointBreakdown },
    pointValues: { ...POINTS },
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
  let referrerEntry = null
  if (referrerCode) {
    referrerEntry = findEntryByRefCode(list, referrerCode)
    if (referrerEntry && referrerEntry.email !== email) {
      referrerEntry.referralCount += 1
      referrerEntry.pointBreakdown.referrals += POINTS.REFERRAL
      // If this email was previously invited by the referrer, also credit
      // the conversion bonus.
      if (referrerEntry.invitedEmails?.has(email)) {
        referrerEntry.pointBreakdown.invitesConverted += POINTS.INVITE_CONVERTED
      }
    } else {
      referrerEntry = null
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
    // Gamification state.
    pointBreakdown: { referrals: 0, shares: 0, invitesSent: 0, invitesConverted: 0 },
    sharedPlatforms: new Map(),  // platform -> last ISO date (yyyy-mm-dd)
    invitedEmails: new Set(),    // emails this entry has sent invitations to
  }
  list.entries.set(email, entry)
  // Activity log: a join, and a separate referral event if applicable.
  pushActivity(list, { type: 'join', who: maskEmail(email), source: referrerEntry ? 'referral' : 'direct' })
  if (referrerEntry) {
    pushActivity(list, { type: 'referral', who: maskEmail(referrerEntry.email), invited: maskEmail(email) })
  }
  return send(res, 200, entryToJoinResponse(list, entry, false))
}

// --- POST /v1/waitlist/track-share ---

async function handleTrackShare(req, res) {
  let body
  try { body = await readJson(req) } catch { return err(res, 400, 'invalid json') }
  const slug = (body.waitlist || '').toString().trim()
  const refCode = (body.refCode || '').toString().trim()
  const platform = (body.platform || '').toString().trim().toLowerCase()

  if (!slug || !refCode || !platform) return err(res, 400, 'waitlist, refCode, platform required')
  if (!SHARE_PLATFORMS.has(platform)) return err(res, 400, `unknown platform: ${platform}`)

  const list = lists.get(slug)
  if (!list) return err(res, 404, 'waitlist not found')
  const entry = findEntryByRefCode(list, refCode)
  if (!entry) return err(res, 404, 'entry not found')

  const today = new Date().toISOString().slice(0, 10)
  const lastDay = entry.sharedPlatforms.get(platform)
  const alreadyToday = lastDay === today
  if (!alreadyToday) {
    entry.sharedPlatforms.set(platform, today)
    entry.pointBreakdown.shares += POINTS.SHARE
    pushActivity(list, { type: 'share', who: maskEmail(entry.email), platform })
  }
  return send(res, 200, {
    ok: true,
    awarded: alreadyToday ? 0 : POINTS.SHARE,
    alreadyClaimed: alreadyToday,
    points: totalPoints(entry),
    pointBreakdown: { ...entry.pointBreakdown },
  })
}

// --- POST /v1/waitlist/invite ---

async function handleInvite(req, res) {
  let body
  try { body = await readJson(req) } catch { return err(res, 400, 'invalid json') }
  const slug = (body.waitlist || '').toString().trim()
  const refCode = (body.refCode || '').toString().trim()
  const emails = Array.isArray(body.emails) ? body.emails : []
  const message = (body.message || '').toString().slice(0, 1000)

  if (!slug || !refCode || emails.length === 0) {
    return err(res, 400, 'waitlist, refCode, emails required')
  }
  if (emails.length > INVITE_MAX_BATCH) {
    return err(res, 400, `max ${INVITE_MAX_BATCH} emails per batch`)
  }

  const ip = clientIp(req)
  if (!allow(`invite:${ip}`)) return err(res, 429, 'rate limit exceeded')

  const list = lists.get(slug)
  if (!list) return err(res, 404, 'waitlist not found')
  const entry = findEntryByRefCode(list, refCode)
  if (!entry) return err(res, 404, 'entry not found')

  const seen = new Set()
  const sent = []
  const skipped = []   // already on the list
  const invalid = []
  const duplicates = []

  for (const raw of emails) {
    const e = (raw || '').toString().trim().toLowerCase()
    if (!e) continue
    if (seen.has(e)) { duplicates.push(e); continue }
    seen.add(e)
    if (!isValidEmail(e)) { invalid.push(e); continue }
    if (DISPOSABLE.has(domain(e))) { invalid.push(e); continue }
    if (e === entry.email) { invalid.push(e); continue } // don't invite yourself
    if (list.entries.has(e)) { skipped.push(e); continue }
    entry.invitedEmails.add(e)
    sent.push(e)
    entry.pointBreakdown.invitesSent += POINTS.INVITE_SENT
    pushActivity(list, { type: 'invite', who: maskEmail(entry.email), invited: maskEmail(e) })
    // In production this is where you'd enqueue a real email send. The
    // mock just logs so you can see what would have been sent.
    console.log(`[mock-api] invite from ${entry.email} -> ${e}` +
      (message ? ` ("${message.slice(0, 40)}${message.length > 40 ? '…' : ''}")` : ''))
  }

  return send(res, 200, {
    ok: true,
    sent: sent.length,
    skipped: skipped.length,
    invalid: invalid.length,
    duplicates: duplicates.length,
    pointsAwarded: sent.length * POINTS.INVITE_SENT,
    points: totalPoints(entry),
    pointBreakdown: { ...entry.pointBreakdown },
  })
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

function handleList(req, url, res) {
  const slug = (url.searchParams.get('waitlist') || '').trim()
  if (!slug) return err(res, 400, 'waitlist is required')
  const list = lists.get(slug)
  if (!list) return send(res, 200, { ok: true, entries: [], page: 1, pageSize: 0, total: 0 })

  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const pageSize = Math.max(1, Math.min(500, Number(url.searchParams.get('pageSize') || 100)))
  const isAdmin = !!ADMIN_SECRET && (req.headers['authorization'] || '') === `Bearer ${ADMIN_SECRET}`

  const sorted = [...list.entries.values()].sort(
    (a, b) => totalPoints(b) - totalPoints(a) || a.createdAt - b.createdAt
  )
  const total = sorted.length
  const start = (page - 1) * pageSize
  const slice = sorted.slice(start, start + pageSize).map((e, i) => ({
    rank: start + i + 1,
    email: isAdmin ? e.email : maskEmail(e.email),
    refCode: isAdmin ? e.refCode : null,
    points: totalPoints(e),
    referralCount: e.referralCount,
    createdAt: new Date(e.createdAt).toISOString(),
  }))
  send(res, 200, {
    ok: true,
    waitlist: slug,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    entries: slice,
  })
}

// --- GET /v1/waitlist/activity ---

function handleActivity(req, url, res) {
  const slug = (url.searchParams.get('waitlist') || '').trim()
  if (!slug) return err(res, 400, 'waitlist is required')
  const list = lists.get(slug)
  const limit = Math.max(1, Math.min(ACTIVITY_LIMIT_CAP, Number(url.searchParams.get('limit') || 20)))
  const typesParam = (url.searchParams.get('types') || '').trim()
  const typeFilter = typesParam
    ? new Set(typesParam.split(',').map((s) => s.trim().toLowerCase()).filter((s) => ACTIVITY_TYPES.has(s)))
    : null

  if (!list) {
    return send(res, 200, { ok: true, waitlist: slug, now: Date.now(), entries: [] })
  }

  const filtered = (typeFilter ? list.activity.filter((e) => typeFilter.has(e.type)) : list.activity)
  // Most-recent first.
  const sliced = filtered.slice(Math.max(0, filtered.length - limit)).reverse()
  return send(res, 200, {
    ok: true,
    waitlist: slug,
    now: Date.now(),
    entries: sliced,
  })
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
    if (req.method === 'GET'  && url.pathname === '/v1/waitlist/list')   return handleList(req, url, res)
    if (req.method === 'GET'  && url.pathname === '/v1/waitlist/activity') return handleActivity(req, url, res)
    if (req.method === 'POST' && url.pathname === '/v1/waitlist/track-share') return await handleTrackShare(req, res)
    if (req.method === 'POST' && url.pathname === '/v1/waitlist/invite') return await handleInvite(req, res)
    if (req.method === 'GET'  && url.pathname === '/v1/waitlist/export') return handleExport(req, url, res)
  } catch (e) {
    console.error('[mock-api]', e)
    return err(res, 500, 'internal error')
  }

  err(res, 404, 'not found')
})

// Optional seed mode: SEED=1200 SEED_SLUG=demo creates a realistic
// distribution of entries. Referral counts follow a Zipf-ish curve so
// the top of the leaderboard has the usual handful of power-referrers
// while most entries sit at 0. Determined entirely by a fixed PRNG seed
// so reloads show identical data.
function seedList(slug, n) {
  const list = listOf(slug)
  // Tiny deterministic PRNG (xmur3 + mulberry32).
  function xmur3(str) {
    let h = 1779033703 ^ str.length
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19)
    }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0 }
  }
  function mulberry32(a) {
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  }
  const seed = xmur3(`hanzo-waitlist:${slug}:${n}`)
  const rand = mulberry32(seed())

  const FIRST = ['alex','sam','jordan','taylor','riley','casey','morgan','jamie','avery','quinn','rowan','sage','blair','reese','drew','hayden','parker','skylar','emerson','finley','iris','kai','leo','mia','nora','owen','piper','ruby','theo','vera','wren','zoe','aria','ben','cleo','dax','eve','felix','gus','holly']
  const LAST  = ['ng','park','silva','chen','khan','okafor','ivanov','rossi','dubois','schmidt','garcia','tanaka','novak','vega','khanna','singh','muller','smith','jones','brown','davis','wilson','moore','taylor','andrade','kobayashi','larsen','vasquez','popescu','romero','holm','lindberg','laine','aalto','seppanen','dubois','beauchamp']
  const TLD   = ['com','io','dev','xyz','co','app','net','me']

  function syntheticEmail(i) {
    const f = FIRST[Math.floor(rand() * FIRST.length)]
    const l = LAST[Math.floor(rand() * LAST.length)]
    const t = TLD[Math.floor(rand() * TLD.length)]
    return `${f}.${l}${i}@example.${t}`
  }

  const start = Date.now() - n * 60_000 // backdate so createdAt order is stable
  for (let i = 0; i < n; i++) {
    const email = syntheticEmail(i)
    let refCode = ''
    for (let attempt = 0; attempt < 8; attempt++) {
      const cand = genRefCode()
      if (![...list.entries.values()].some((e) => e.refCode === cand)) { refCode = cand; break }
    }
    // Zipf-ish: rank^-1.4 normalized to roughly produce top ~40 referrals.
    const referralCount = Math.max(0, Math.floor(40 * Math.pow(1 / Math.max(1, i + 1), 1.4) + (rand() < 0.04 ? Math.floor(rand() * 6) : 0)))
    // Synthesize a plausible pointBreakdown so seeded leaderboard has real
    // gamification depth, not just referral counts.
    const shareEvents = Math.min(8, Math.floor(referralCount * 0.6 + rand() * 3))
    const invitesSent = Math.min(20, Math.floor(referralCount * 1.5 + rand() * 4))
    const invitesConverted = Math.min(referralCount, Math.floor(referralCount * 0.4))
    list.entries.set(email, {
      waitlist: slug,
      email,
      refCode,
      referredBy: '',
      referralCount,
      createdAt: start + i * 60_000,
      pointBreakdown: {
        referrals: referralCount * POINTS.REFERRAL,
        shares: shareEvents * POINTS.SHARE,
        invitesSent: invitesSent * POINTS.INVITE_SENT,
        invitesConverted: invitesConverted * POINTS.INVITE_CONVERTED,
      },
      sharedPlatforms: new Map(),
      invitedEmails: new Set(),
    })
  }
  // Seed recent activity so the live ticker shows action on first page load.
  const seedTypes = ['join','share','invite','referral']
  const platforms = ['x','linkedin','copy','email','reddit','telegram']
  const sample = [...list.entries.values()].sort(() => rand() - 0.5).slice(0, 30)
  for (let i = 0; i < 30; i++) {
    const e = sample[i] || sample[0]
    if (!e) break
    const type = seedTypes[Math.floor(rand() * seedTypes.length)]
    const ts = Date.now() - Math.floor(rand() * 4 * 60 * 60 * 1000) // last 4h
    if (type === 'join') {
      list.activity.push({ ts, type, who: maskEmail(e.email), source: rand() < 0.5 ? 'direct' : 'referral' })
    } else if (type === 'share') {
      list.activity.push({ ts, type, who: maskEmail(e.email), platform: platforms[Math.floor(rand() * platforms.length)] })
    } else if (type === 'invite') {
      list.activity.push({ ts, type, who: maskEmail(e.email), invited: maskEmail(sample[(i + 1) % sample.length].email) })
    } else {
      list.activity.push({ ts, type, who: maskEmail(e.email), invited: maskEmail(sample[(i + 1) % sample.length].email) })
    }
  }
  list.activity.sort((a, b) => a.ts - b.ts)
}

server.listen(PORT, () => {
  console.log(`[mock-api] /v1/waitlist/* on http://localhost:${PORT}`)
  if (!ADMIN_SECRET) console.log('[mock-api] WAITLIST_ADMIN_SECRET unset — /v1/waitlist/export disabled')

  const seedN = Number(process.env.SEED || 0)
  if (seedN > 0) {
    const slug = process.env.SEED_SLUG || 'demo'
    seedList(slug, seedN)
    console.log(`[mock-api] seeded "${slug}" with ${seedN} entries`)
  }
})
