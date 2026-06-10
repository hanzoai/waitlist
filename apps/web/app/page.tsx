'use client'

import { useEffect, useMemo, useState } from 'react'
import { Waitlist, WaitlistLeaderboard, WaitlistClient } from '@hanzo/waitlist'

// Generic preset swatches. NO brand names — this widget ships neutral.
// Each consumer brings their own palette by overriding --hw-accent /
// --hw-accent-fg / --hw-radius on a wrapper class.
const PRESETS = [
  { id: 'neutral',  label: 'Neutral',  className: '' },
  { id: 'preset-a', label: 'Preset A', className: 'preset-a' },
  { id: 'preset-b', label: 'Preset B', className: 'preset-b' },
  { id: 'preset-c', label: 'Preset C', className: 'preset-c' },
  { id: 'preset-d', label: 'Preset D', className: 'preset-d' },
] as const

// Placeholder "logo" for the demo only — generic monogram, intentionally
// not a real brand mark. Real consumers pass their own <img> or <svg>.
function DemoLogo() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="28"
      height="28"
      role="img"
      aria-label="Demo brand mark"
      style={{ color: 'var(--hw-fg, currentColor)' }}
    >
      <rect x="2" y="2" width="28" height="28" rx="6" fill="currentColor" />
      <path
        d="M10 22V10h2.4l5.2 8V10H20v12h-2.4l-5.2-8v8H10z"
        fill="var(--hw-bg, #fff)"
      />
    </svg>
  )
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''
const WAITLIST_SLUG = process.env.NEXT_PUBLIC_WAITLIST_SLUG || 'demo'

export default function HomePage() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['id']>('neutral')
  const presetClass = PRESETS.find((p) => p.id === preset)?.className ?? ''

  // Pull the joined email out of localStorage so the leaderboard can
  // highlight the current viewer's row. Stored by the <Waitlist> widget
  // on successful join.
  const [myEmail, setMyEmail] = useState<string | undefined>(undefined)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`hanzo-waitlist:${WAITLIST_SLUG}`)
      if (raw) setMyEmail(JSON.parse(raw).email)
    } catch { /* noop */ }
  }, [])

  // Live total — the social-proof number in the hero.
  const client = useMemo(() => new WaitlistClient({ baseUrl: BASE_URL || undefined }), [])
  const [total, setTotal] = useState<number | null>(null)
  useEffect(() => {
    let mounted = true
    client.list({ waitlist: WAITLIST_SLUG, page: 1, pageSize: 1 }).then((r) => {
      if (!mounted) return
      if ('ok' in r && r.ok) setTotal(r.total)
    })
    return () => { mounted = false }
  }, [client])

  return (
    <main>
      <section className="hero container" aria-labelledby="hero-title">
        <p className="eyebrow">@hanzo/waitlist</p>
        <h1 id="hero-title" className="h1">
          A waitlist that wears <em>your</em> colors, not ours.
        </h1>
        <p className="lede">
          One monochromatic widget, every brand. Configurable points, real
          referrals, leaderboard, share to anywhere &mdash; all atop a single
          Base plugin. No Redis. No SaaS dependency.
        </p>
        <div className="hero-stats" role="status">
          <div className="hero-stat">
            <span className="hero-stat__num">
              {total === null ? <span className="skeleton skeleton--num" aria-hidden="true">—</span> : total.toLocaleString()}
            </span>
            <span className="hero-stat__label">on the list</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__num">10</span>
            <span className="hero-stat__label">share platforms</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__num">3</span>
            <span className="hero-stat__label">lines to ship</span>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="demo-title">
        <div className="section-head">
          <h2 id="demo-title" className="h2">Live demo</h2>
          <div className="swatch-row" role="tablist" aria-label="Color preset">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={preset === p.id}
                className="swatch"
                data-active={preset === p.id}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`primary-grid ${presetClass}`}>
          <div className="primary-grid__leaderboard">
            <WaitlistLeaderboard
              waitlist={WAITLIST_SLUG}
              baseUrl={BASE_URL || undefined}
              pageSize={10}
              highlightEmail={myEmail}
            />
          </div>
          <div className="primary-grid__widget">
            <Waitlist
              waitlist={WAITLIST_SLUG}
              baseUrl={BASE_URL || undefined}
              logo={<DemoLogo />}
              subtitle="Climb the list by sharing and referring."
            />
          </div>
        </div>

        <details className="code-reveal">
          <summary>Show the override CSS</summary>
          <div className="code-block">
            <pre>{`/* the entire ${preset === 'neutral' ? '(default neutral)' : `'${preset}'`} re-skin */
.${preset === 'neutral' ? 'your-brand' : preset} {
  --hw-accent: <accent color>;
  --hw-accent-fg: <text on accent>;
  --hw-radius: <corner radius>;
}`}</pre>
          </div>
        </details>
      </section>

      <section className="section container" aria-labelledby="ships-title">
        <h2 id="ships-title" className="h2">Everything ships in the box</h2>
        <div className="grid">
          <div className="feature">
            <h3>Base backend</h3>
            <p>One Go plugin: collections, REST, atomic referrals, abuse defenses. No Redis, no SaaS dependency, no per-brand fork.</p>
          </div>
          <div className="feature">
            <h3>Brand-neutral by default</h3>
            <p>Zero hardcoded colors, zero logos, zero brand names in the package. CSS variables do the rest.</p>
          </div>
          <div className="feature">
            <h3>React or drop-in element</h3>
            <p>The React component, the framework-free fetch client, or the {'<hanzo-waitlist>'} custom element &mdash; same one source.</p>
          </div>
          <div className="feature">
            <h3>Gamified points</h3>
            <p>Every action awards points: referrals, shares, invites sent, friends converted. Per-platform daily caps. Tunable per consumer.</p>
          </div>
          <div className="feature">
            <h3>10 share targets</h3>
            <p>Web Share API + Email, X, LinkedIn, Facebook, Reddit, Telegram, WhatsApp, SMS, Copy link. Each with its own point value.</p>
          </div>
          <div className="feature">
            <h3>Invite friends by email</h3>
            <p>Paste a list, send invites, earn points &mdash; bonus when invitees join. Rate-limited, dedup-checked, disposable-blocked.</p>
          </div>
          <div className="feature">
            <h3>Paginated leaderboard</h3>
            <p>Public-safe view: emails masked unless an admin token is attached. Highlights the viewer&rsquo;s own row. Brand re-skin follows the widget.</p>
          </div>
          <div className="feature">
            <h3>Anti-abuse built in</h3>
            <p>Cloudflare Turnstile verify, per-IP sliding-window rate limits, disposable-domain blocklist, atomic SQL transactions.</p>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="install-title">
        <h2 id="install-title" className="h2">Three lines to ship</h2>
        <div className="code-block code-block--lg">
          <pre>{`import { Waitlist } from '@hanzo/waitlist'
import '@hanzo/waitlist/styles.css'

<Waitlist waitlist="my-product" baseUrl="https://api.example.com" />`}</pre>
        </div>
      </section>

      <footer className="footer container">
        <p>MIT &middot; one way to do it &middot; DRY, composable, orthogonal</p>
      </footer>
    </main>
  )
}
