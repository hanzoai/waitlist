# Hanzo Waitlist

[中文](./README.zh-CN.md)

Monochromatic, brand-neutral viral waitlist. No logos, no brand colors,
no embedded identity — each consumer brings its own. Backed by
[Hanzo Base](https://github.com/hanzoai/base); no Redis, no third-party SaaS.

```tsx
import { Waitlist } from '@hanzo/waitlist'
import '@hanzo/waitlist/styles.css'

<Waitlist waitlist="my-product" baseUrl="https://api.example.com" />
```

## What's in this repo

| Path                          | What |
|-------------------------------|------|
| `packages/widget/`            | `@hanzo/waitlist` — React + framework-free client + custom element |
| `apps/web/`                   | Demo site (Next.js) — brand-swappable preview |
| `docs/`                       | [architecture](./docs/architecture.md), [api](./docs/api.md), [widget](./docs/widget.md) |

The server lives in **a different repo**: `~/work/hanzo/base` under
`plugins/waitlist/`. Register it on any Base process:

```go
import "github.com/hanzoai/base/plugins/waitlist"

waitlist.MustRegister(app, waitlist.Config{
    Enabled:         true,
    TurnstileSecret: os.Getenv("TURNSTILE_SECRET_KEY"),
    AdminSecret:     os.Getenv("WAITLIST_ADMIN_SECRET"),
})
```

Two collections (`waitlists`, `waitlist_entries`) are created on first
boot. Three endpoints are mounted under `/v1/waitlist`.

## Quick start (dev)

```bash
pnpm install
pnpm --filter @hanzo/waitlist build

# Terminal 1: backend (mock reference impl, in-memory)
pnpm --filter @hanzo/waitlist-mock-api dev   # listens on :8090

# Terminal 2: demo
NEXT_PUBLIC_BASE_URL=http://localhost:8090 \
  pnpm --filter @hanzo/waitlist-demo dev     # http://localhost:3000
```

For production you swap `mock-api` for a real Hanzo Base instance with
`plugins/waitlist` registered. The mock implements the exact same
`/v1/waitlist/{join,status,export}` contract — it's both the demo
backend and the executable spec.

## Theming

Zero brand colors in the widget. Bring your own selector + variables:

```css
.your-brand {
  --hw-accent: <your accent color>;
  --hw-accent-fg: <text on accent>;
  --hw-radius: <corner radius>;
}
```

Logos, headlines, and any embedded identity are the host's responsibility.
The widget itself ships fully neutral.

Full variable list: [`docs/widget.md`](./docs/widget.md).

## API

| Endpoint                       | Purpose |
|--------------------------------|---------|
| `POST /v1/waitlist/join`       | Register an entry, credit referrer atomically |
| `GET /v1/waitlist/status`      | Look up rank + share URL |
| `GET /v1/waitlist/export`      | Admin CSV (superuser or shared-secret gated) |

Wire format: [`docs/api.md`](./docs/api.md).

## License

MIT.
