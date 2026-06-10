# Architecture

Three pieces. No more.

```
+------------------------------+        +-----------------------------+
|  @hanzo/waitlist (browser)   |  --->  |  Hanzo Base (Go server)     |
|  React widget / web element  |   /v1  |  plugin: plugins/waitlist   |
|  client.ts (fetch only)      |        |  SQLite (local-first)       |
+------------------------------+        +-----------------------------+
                                                       |
                                                       v
                                              encrypted CRDT sync
                                              (Base's normal behavior)
```

## Layers

1. **Storage** — Two Base collections owned by the plugin.

   - `waitlists` — `{ id, slug, name, createdAt, updatedAt }`. One row per
     project. `slug` is unique and is what the widget posts.
   - `waitlist_entries` — `{ id, waitlist, email, refCode, referredBy,
     referralCount, createdAt }`. Indexes:
     - `UNIQUE (waitlist, email)`
     - `UNIQUE (waitlist, refCode)`
     - `(waitlist, referralCount DESC, createdAt ASC)` — rank query

2. **Server logic** — `~/work/hanzo/base/plugins/waitlist/`.

   - Auto-creates the collections on bootstrap.
   - Mounts three endpoints under `/v1/waitlist`.
   - All mutating logic runs inside `app.RunInTransaction`. Referral
     counts increment atomically; duplicate registrations are idempotent.
   - Anti-abuse: Cloudflare Turnstile verify + in-memory sliding-window
     rate-limit (default 5/IP/hour) + disposable-domain blocklist.

3. **Client** — `packages/widget/` published as `@hanzo/waitlist`.

   - `WaitlistClient` (plain TS fetch — no React).
   - `<Waitlist>` (React component).
   - `<hanzo-waitlist>` (custom element bundle for zero-bundler use).
   - Monochromatic CSS variables only. No brand colors in the package.

## Why these choices

- **Why Base instead of Redis**: Base already gives us atomic SQL
  transactions, an auth/admin surface, a dashboard, IAM integration,
  CRDT replication, and chain-anchored audit. Re-adding Redis would be
  a parallel-truth source for one feature.
- **Why a Go plugin instead of plain Collection rules**: rate-limit and
  Turnstile verification need code paths that don't fit cleanly in
  Base's record rules. Putting the logic in one Go file is simpler than
  splitting it across rules + hooks + a sidecar.
- **Why monochrome**: the widget is consumed by many brands. Hardcoded
  brand colors would either look wrong on most of them, or force a
  per-brand build. CSS variables let each consumer override a handful
  of knobs.

## Wire format

See [`api.md`](./api.md).
