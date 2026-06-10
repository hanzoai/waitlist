'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Waitlist,
  WaitlistLeaderboard,
  WaitlistActivity,
  WaitlistClient,
  usePersistedEntry,
  writePersistedEntry,
} from '@hanzo/waitlist'

// Subtle developer-only knob — press `b` to cycle brand presets.
const PRESETS = [
  { id: 'neutral',  className: '' },
  { id: 'preset-a', className: 'preset-a' },
  { id: 'preset-b', className: 'preset-b' },
  { id: 'preset-c', className: 'preset-c' },
  { id: 'preset-d', className: 'preset-d' },
] as const

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''
const WAITLIST_SLUG = process.env.NEXT_PUBLIC_WAITLIST_SLUG || 'demo'

// Hanzo monochrome mark — inlined from ~/work/hanzo/logo getMonoSVG.
function HanzoMark({ size = 32 }: { size?: number }) {
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

  // Single source of truth — shared with the widget. Reactive across tabs
  // AND across same-tab writes (via the hook's internal event subscription).
  const cached = usePersistedEntry(WAITLIST_SLUG)

  // After mount: refetch status so the topbar pill shows the freshest rank.
  // The hook owns the cache shape; this just keeps the rank fresh.
  useEffect(() => {
    if (!cached?.email) return
    const c = new WaitlistClient({ baseUrl: BASE_URL || undefined })
    c.status({ waitlist: WAITLIST_SLUG, email: cached.email }).then((r) => {
      if ('ok' in r && r.ok) {
        writePersistedEntry(WAITLIST_SLUG, { email: r.email, rank: r.rank, refCode: r.refCode })
      }
    })
  }, [cached?.email])

  // Dev-only: press `b` to cycle brand presets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'b' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
      setPreset((p) => {
        const i = PRESETS.findIndex((x) => x.id === p)
        return PRESETS[(i + 1) % PRESETS.length].id
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scrollToJoin = useCallback(() => {
    const el = document.getElementById('join')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Focus the first focusable input inside the widget.
    setTimeout(() => {
      const input = el.querySelector<HTMLInputElement>('.hanzo-waitlist__input')
      input?.focus({ preventScroll: true })
    }, 420)
  }, [])

  const shareNow = useCallback(async () => {
    if (!cached?.refCode) return
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('ref', cached.refCode)
    const text = cached.rank ? `I'm #${cached.rank.toLocaleString()} on the waitlist. Climb with me:` : 'Join the waitlist:'
    if ('share' in navigator) {
      try { await navigator.share({ text, url: url.toString() }) } catch { /* user cancelled */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url.toString())
    }
  }, [cached])

  const joined = !!cached?.email

  return (
    <main className={presetClass}>
      <header className="topbar">
        <div className="topbar__inner container">
          <a href="/" className="topbar__brand" aria-label="Hanzo home">
            <HanzoMark size={28} />
            <span className="topbar__wordmark">Hanzo</span>
          </a>
          <div className="topbar__cta">
            {joined ? (
              <button type="button" className="cta cta--solid" onClick={shareNow} aria-label="Share your waitlist link">
                <span className="cta__rank">#{(cached?.rank ?? 0).toLocaleString()}</span>
                <span className="cta__sep" aria-hidden="true">·</span>
                <span>Share</span>
              </button>
            ) : (
              <button type="button" className="cta cta--solid" onClick={scrollToJoin}>
                Join the waitlist
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="section section--first section--glow container" aria-labelledby="lb-title">
        <div className="section-head section-head--center">
          <h1 id="lb-title" className="h1 h1--lg">Waitlist</h1>
          <p className="lede lede--center">
            Climb the leaderboard. Refer friends, share to anywhere, send invites &mdash;
            every action earns points.
          </p>
        </div>
        <div className="board-grid">
          <div className="board-grid__main">
            <WaitlistLeaderboard
              waitlist={WAITLIST_SLUG}
              baseUrl={BASE_URL || undefined}
              pageSize={10}
              highlightEmail={cached?.email}
              loadMoreLabel="Show more"
            />
          </div>
          <aside className="board-grid__aside">
            <WaitlistActivity
              waitlist={WAITLIST_SLUG}
              baseUrl={BASE_URL || undefined}
              limit={10}
              pollInterval={12000}
              heading="Live"
            />
          </aside>
        </div>
      </section>

      <section className="section section--alt container" aria-labelledby="join-title" id="join">
        <div className="join-wrap">
          <div className="join-intro">
            <h2 id="join-title" className="h2 h2--lg">Reserve your spot</h2>
            <p className="join-lede">
              Drop your email to lock it in. Then climb the list by sharing,
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
              title="Join the waitlist"
              subtitle="Free and instant. No spam."
              shareTargets={['webshare', 'x', 'linkedin', 'email', 'reddit', 'telegram', 'whatsapp', 'sms', 'copy']}
            />
          </div>
        </div>
      </section>

      <footer className="footer container">
        <div className="footer__row">
          <div className="footer__brand">
            <HanzoMark size={20} />
            <span>Hanzo &middot; built on Base</span>
          </div>
          <div className="footer__meta">MIT &middot; one way to do it</div>
        </div>
      </footer>
    </main>
  )
}
