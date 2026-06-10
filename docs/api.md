# API

Three endpoints, mounted by `plugins/waitlist` at `/v1/waitlist/*`.

All paths are relative to `BASE_API_PREFIX` (default `/v1`). The three
endpoints below assume the default.

## POST /v1/waitlist/join

Register a new entry, or return the existing one if (waitlist, email)
already exists. Idempotent.

**Request**
```json
{
  "waitlist": "my-product",
  "email": "alice@example.com",
  "referrerCode": "Bcd6789F",
  "turnstileToken": "0.AAAA..."
}
```

`waitlist` is the slug *or* the record id. `referrerCode` and
`turnstileToken` are optional.

**Response**
```json
{
  "ok": true,
  "waitlist": "my-product",
  "email": "alice@example.com",
  "refCode": "Jk9mNpQr",
  "rank": 42,
  "total": 1234,
  "referralCount": 0,
  "shareUrl": "?ref=Jk9mNpQr",
  "alreadyJoined": false
}
```

`alreadyJoined: true` means the email already existed; the response
returns the existing entry unchanged.

**Errors**
- `400` invalid email / disposable domain / missing fields / captcha failed
- `404` waitlist slug not found
- `429` per-IP rate limit exceeded
- `500` storage error

## GET /v1/waitlist/status?waitlist=&email=

Look up an entry's current rank.

**Response**
```json
{
  "ok": true,
  "waitlist": "my-product",
  "email": "alice@example.com",
  "refCode": "Jk9mNpQr",
  "rank": 42,
  "total": 1234,
  "aheadOf": 1192,
  "referralCount": 3,
  "shareUrl": "?ref=Jk9mNpQr"
}
```

## GET /v1/waitlist/export?waitlist=

Admin CSV dump. Either:
- `Authorization: Bearer <WAITLIST_ADMIN_SECRET>` header, or
- a Base superuser session.

Response is `text/csv` with columns:
```
rank,email,refCode,referredBy,referralCount,createdAt
```

## Rank semantics

Rank = `1 + count(entries with (referralCount > me) OR (referralCount = me
AND createdAt < me))`. Ties go to the earlier joiner.
