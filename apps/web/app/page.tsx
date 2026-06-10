'use client'

import { useState } from 'react'
import { Waitlist } from '@hanzo/waitlist'

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

  return (
    <main>
      <header className="section container">
        <p className="eyebrow">@hanzo/waitlist</p>
        <h1 className="h1">A waitlist that wears your colors, not ours.</h1>
        <p className="lede">
          One monochromatic widget. No logos, no brand colors, no embedded
          identity. Override a handful of CSS variables and it becomes yours.
          Backed by a single Base plugin &mdash; no Redis, no third-party SaaS.
        </p>
      </header>

      <section className="section container">
        <h2 className="h2">Live demo</h2>
        <div className="demo-cluster">
          <div>
            <div className="swatch-row" role="tablist" aria-label="Color preset">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  className="swatch"
                  data-active={preset === p.id}
                  onClick={() => setPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="code-block">
              <pre>{`<Waitlist
  waitlist="${WAITLIST_SLUG}"
  baseUrl="${BASE_URL || 'https://api.example.com'}"
/>

/* one selector, three variables, full re-skin */
.${preset || 'your-brand'} {
  --hw-accent: <your color>;
  --hw-accent-fg: <your text on accent>;
  --hw-radius: <your corner radius>;
}`}</pre>
            </div>
          </div>

          <div className={presetClass}>
            <Waitlist
              waitlist={WAITLIST_SLUG}
              baseUrl={BASE_URL || undefined}
              logo={<DemoLogo />}
              subtitle="Climb the list by referring friends."
            />
          </div>
        </div>
      </section>

      <section className="section container">
        <h2 className="h2">What ships</h2>
        <div className="grid">
          <div className="feature">
            <h3>Base backend</h3>
            <p>One Go plugin: collections, REST, atomic referrals, abuse defenses. No Redis. No SaaS dependency.</p>
          </div>
          <div className="feature">
            <h3>Brand-neutral by default</h3>
            <p>Zero hardcoded colors, zero logos, zero brand names in the package. CSS variables do the rest.</p>
          </div>
          <div className="feature">
            <h3>React or drop-in</h3>
            <p>Use the React component, the framework-free fetch client, or the {'<hanzo-waitlist>'} custom element.</p>
          </div>
          <div className="feature">
            <h3>Atomic referrals</h3>
            <p>SQL transaction credits the referrer, allocates a unique code, persists the entry &mdash; all-or-nothing.</p>
          </div>
          <div className="feature">
            <h3>Turnstile + rate-limit</h3>
            <p>Server verifies Cloudflare Turnstile tokens and caps per-IP joins. Disposable domains rejected.</p>
          </div>
          <div className="feature">
            <h3>Admin CSV export</h3>
            <p>GET /v1/waitlist/export returns a sorted CSV, gated on superuser auth or a shared secret.</p>
          </div>
        </div>
      </section>

      <section className="section container">
        <h2 className="h2">Three lines</h2>
        <div className="code-block">
          <pre>{`import { Waitlist } from '@hanzo/waitlist'
import '@hanzo/waitlist/styles.css'

<Waitlist waitlist="my-product" baseUrl="https://api.example.com" />`}</pre>
        </div>
      </section>

      <footer className="footer container">
        <p>MIT &middot; One way to do it &middot; DRY, composable, orthogonal.</p>
      </footer>
    </main>
  )
}
