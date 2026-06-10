'use client'

import { useEffect, useState } from 'react'
import { Waitlist, WaitlistLeaderboard } from '@hanzo/waitlist'

// Subtle developer-only knob — flip the brand to prove the widget is
// truly brand-neutral. Hidden by default; press `b` to cycle.
const PRESETS = [
  { id: 'neutral',  className: '' },
  { id: 'preset-a', className: 'preset-a' },
  { id: 'preset-b', className: 'preset-b' },
  { id: 'preset-c', className: 'preset-c' },
  { id: 'preset-d', className: 'preset-d' },
] as const

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''
const WAITLIST_SLUG = process.env.NEXT_PUBLIC_WAITLIST_SLUG || 'demo'

// Hanzo monochrome mark — source: ~/work/hanzo/logo (getMonoSVG).
// Inlined so the demo stays self-contained without a runtime dep on
// @hanzo/logo. Fill uses currentColor so it inherits theme automatically.
function HanzoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 67 67"
      width={size}
      height={size}
      role="img"
      aria-label="Hanzo"
      style={{ display: 'block' }}
    >
      <path d="M22.21 67V44.6369H0V67H22.21Z" fill="currentColor" />
      <path d="M0 44.6369L22.21 46.8285V44.6369H0Z" fill="currentColor" opacity=".75" />
      <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" fill="currentColor" />
      <path d="M22.21 0H0V22.3184H22.21V0Z" fill="currentColor" />
      <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" fill="currentColor" />
      <path d="M66.6753 22.3185L44.5098 20.0822V22.3185H66.6753Z" fill="currentColor" opacity=".75" />
      <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" fill="currentColor" />
    </svg>
  )
}

export default function HomePage() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['id']>('neutral')
  const presetClass = PRESETS.find((p) => p.id === preset)?.className ?? ''

  // Pull the joined email out of localStorage so the leaderboard highlights
  // the current viewer's row. Stored by the <Waitlist> widget on join.
  const [myEmail, setMyEmail] = useState<string | undefined>(undefined)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`hanzo-waitlist:${WAITLIST_SLUG}`)
      if (raw) setMyEmail(JSON.parse(raw).email)
    } catch { /* noop */ }
  }, [])

  // Dev-only: press `b` to cycle brand presets (proves brand-neutrality
  // without dominating the chrome).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        setPreset((p) => {
          const i = PRESETS.findIndex((x) => x.id === p)
          return PRESETS[(i + 1) % PRESETS.length].id
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main className={presetClass}>
      <header className="topbar container">
        <a href="/" className="topbar__brand" aria-label="Hanzo home">
          <HanzoMark size={32} />
        </a>
      </header>

      <section className="section container" aria-labelledby="lb-title">
        <div className="section-head section-head--center">
          <h1 id="lb-title" className="h1 h1--lg">Waitlist</h1>
          <p className="lede lede--center">
            Climb the leaderboard. Refer friends, share to anywhere, send invites &mdash;
            every action earns points.
          </p>
        </div>
        <WaitlistLeaderboard
          waitlist={WAITLIST_SLUG}
          baseUrl={BASE_URL || undefined}
          pageSize={10}
          highlightEmail={myEmail}
        />
      </section>

      <section className="section section--alt container" aria-labelledby="join-title">
        <div className="join-wrap">
          <div className="join-intro">
            <h2 id="join-title" className="h2 h2--lg">Join the waitlist</h2>
            <p className="join-lede">
              Drop your email to lock in your spot. Then climb the list by sharing,
              referring, and inviting friends.
            </p>
            <ul className="join-bullets">
              <li><b>10 points</b> per friend you refer who joins</li>
              <li><b>2 points</b> per platform you share on (once per day)</li>
              <li><b>5 points</b> bonus when an invited friend signs up</li>
            </ul>
          </div>
          <div className="join-widget">
            <Waitlist
              waitlist={WAITLIST_SLUG}
              baseUrl={BASE_URL || undefined}
              logo={<HanzoMark size={28} />}
              title="Reserve your spot"
              subtitle="Free and instant. No spam."
            />
          </div>
        </div>
      </section>

      <footer className="footer container">
        <div className="footer__row">
          <div className="footer__brand">
            <HanzoMark size={22} />
            <span>Hanzo &middot; built on Base</span>
          </div>
          <div className="footer__meta">MIT &middot; one way to do it</div>
        </div>
      </footer>
    </main>
  )
}
