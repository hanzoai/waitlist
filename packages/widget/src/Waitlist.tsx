import { useCallback, useEffect, useMemo, useState } from 'react'
import { WaitlistClient, type WaitlistEntry } from './client'

export type WaitlistMode = 'inline' | 'modal'
export type WaitlistTheme = 'auto' | 'light' | 'dark'

const STORAGE_KEY = (slug: string) => `hanzo-waitlist:${slug}`
const REF_KEY = 'hanzo-waitlist:ref'

export interface WaitlistProps {
  /** Slug or id of the waitlist on the Base server. */
  waitlist: string

  /** Where the Base server lives. Defaults to current origin. */
  baseUrl?: string

  /** Layout: `inline` renders the form in place, `modal` renders a button that opens it. */
  mode?: WaitlistMode

  /** Light / dark / `auto` (follow OS). */
  theme?: WaitlistTheme

  /**
   * Brand logo / mark. The widget ships with NO logo — each consumer
   * provides its own. Pass any React node (img, svg, or wrapper). Rendered
   * above the title with consistent spacing; no styling is applied to the
   * node itself so you control size + color. Omit for a logo-less layout.
   */
  logo?: React.ReactNode

  /** Override copy. */
  title?: string
  subtitle?: string
  submitLabel?: string
  successTitle?: string
  successSubtitle?: (entry: WaitlistEntry) => string

  /** Optional CTA before user submits (modal mode). */
  triggerLabel?: string

  /**
   * If your Base server has Turnstile enabled, supply the token here.
   * The widget itself does NOT mount a Turnstile challenge — that's the
   * host's responsibility, since Turnstile is brand-bound.
   */
  turnstileToken?: string

  /** Disable share buttons after success. */
  hideShare?: boolean

  /** Forward to root container. */
  className?: string
  style?: React.CSSProperties

  /** Callbacks. */
  onSuccess?: (entry: WaitlistEntry) => void
  onError?: (err: { message: string; status: number }) => void
}

type ViewState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; entry: WaitlistEntry }
  | { kind: 'error'; message: string }

export function Waitlist(props: WaitlistProps) {
  const {
    waitlist,
    baseUrl,
    mode = 'inline',
    theme = 'auto',
    logo,
    title = 'Join the waitlist',
    subtitle,
    submitLabel = 'Join',
    successTitle = "You're on the list",
    successSubtitle = (e) => (e.aheadOf && e.aheadOf > 0
      ? `${e.aheadOf.toLocaleString()} ${e.aheadOf === 1 ? 'person is' : 'people are'} behind you. Refer friends to climb.`
      : 'Refer friends to climb the list.'),
    triggerLabel = 'Join waitlist',
    turnstileToken,
    hideShare,
    className,
    style,
    onSuccess,
    onError,
  } = props

  const client = useMemo(() => new WaitlistClient({ baseUrl }), [baseUrl])

  const [email, setEmail] = useState('')
  const [view, setView] = useState<ViewState>({ kind: 'idle' })
  const [modalOpen, setModalOpen] = useState(false)

  // On mount: rehydrate session, capture ?ref=
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref) localStorage.setItem(REF_KEY, ref)
    } catch { /* noop */ }

    try {
      const raw = localStorage.getItem(STORAGE_KEY(waitlist))
      if (!raw) return
      const cached = JSON.parse(raw) as { email: string }
      if (!cached.email) return
      client.status({ waitlist, email: cached.email }).then((res) => {
        if ('ok' in res && res.ok) setView({ kind: 'success', entry: res })
      })
    } catch { /* noop */ }
  }, [client, waitlist])

  const submit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (view.kind === 'submitting') return
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setView({ kind: 'error', message: 'Enter a valid email address.' })
      return
    }

    setView({ kind: 'submitting' })
    const referrerCode = (() => {
      try { return localStorage.getItem(REF_KEY) ?? undefined } catch { return undefined }
    })()

    const result = await client.join({
      waitlist,
      email: normalized,
      referrerCode,
      turnstileToken,
    })

    if ('ok' in result && result.ok) {
      try {
        localStorage.setItem(STORAGE_KEY(waitlist), JSON.stringify({ email: normalized }))
      } catch { /* noop */ }
      setView({ kind: 'success', entry: result })
      onSuccess?.(result)
      return
    }
    const message = result.message || 'Something went wrong. Try again.'
    setView({ kind: 'error', message })
    onError?.({ message, status: result.status })
  }, [client, email, onError, onSuccess, turnstileToken, view.kind, waitlist])

  const card = (
    <Card theme={theme} className={className} style={style}>
      {logo && <div className="hanzo-waitlist__logo">{logo}</div>}
      {view.kind === 'success'
        ? (
            <Success
              entry={view.entry}
              title={successTitle}
              subtitle={successSubtitle}
              hideShare={hideShare}
            />
          )
        : (
            <Form
              title={title}
              subtitle={subtitle}
              submitLabel={submitLabel}
              email={email}
              setEmail={setEmail}
              submit={submit}
              busy={view.kind === 'submitting'}
              error={view.kind === 'error' ? view.message : undefined}
            />
          )}
    </Card>
  )

  if (mode === 'inline') return card

  return (
    <>
      <button
        type="button"
        className="hanzo-waitlist__trigger"
        onClick={() => setModalOpen(true)}
      >
        {view.kind === 'success' ? `#${view.entry.rank} — view` : triggerLabel}
      </button>
      {modalOpen && (
        <div
          className="hanzo-waitlist__backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="hanzo-waitlist__dialog">{card}</div>
        </div>
      )}
    </>
  )
}

function Card(p: { theme: WaitlistTheme; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const themeAttr = p.theme === 'auto' ? undefined : p.theme
  const className = ['hanzo-waitlist', p.className].filter(Boolean).join(' ')
  return (
    <div className={className} data-theme={themeAttr} style={p.style}>
      <div className="hanzo-waitlist__card">{p.children}</div>
    </div>
  )
}

function Form(p: {
  title: string
  subtitle?: string
  submitLabel: string
  email: string
  setEmail: (v: string) => void
  submit: (e?: React.FormEvent) => void
  busy: boolean
  error?: string
}) {
  return (
    <form onSubmit={p.submit} noValidate>
      <h3 className="hanzo-waitlist__title">{p.title}</h3>
      {p.subtitle && <p className="hanzo-waitlist__subtitle">{p.subtitle}</p>}
      <div className="hanzo-waitlist__row">
        <input
          className="hanzo-waitlist__input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={p.email}
          onChange={(e) => p.setEmail(e.currentTarget.value)}
          disabled={p.busy}
          aria-label="Email address"
          required
        />
        <button
          type="submit"
          className="hanzo-waitlist__button"
          disabled={p.busy || !p.email}
        >
          {p.busy ? '...' : p.submitLabel}
        </button>
      </div>
      {p.error && <p className="hanzo-waitlist__error" role="alert">{p.error}</p>}
    </form>
  )
}

function Success(p: {
  entry: WaitlistEntry
  title: string
  subtitle: (e: WaitlistEntry) => string
  hideShare?: boolean
}) {
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return p.entry.shareUrl
    const u = new URL(window.location.href)
    u.search = ''
    u.searchParams.set('ref', p.entry.refCode)
    return u.toString()
  }, [p.entry.refCode, p.entry.shareUrl])

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm #${p.entry.rank} on the waitlist. Join me:`)}&url=${encodeURIComponent(shareUrl)}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`I'm #${p.entry.rank} on the waitlist — join me: ${shareUrl}`)}`

  const copy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => undefined)
    }
  }

  return (
    <div className="hanzo-waitlist__success">
      <h3 className="hanzo-waitlist__title" style={{ textAlign: 'center' }}>{p.title}</h3>
      <div className="hanzo-waitlist__rank" aria-label={`Rank ${p.entry.rank} of ${p.entry.total}`}>{p.entry.rank.toLocaleString()}</div>
      <p className="hanzo-waitlist__of" aria-hidden="true">
        of {p.entry.total.toLocaleString()}
      </p>
      <p className="hanzo-waitlist__meta">{p.subtitle(p.entry)}</p>
      {!p.hideShare && (
        <div className="hanzo-waitlist__share">
          <a className="hanzo-waitlist__button hanzo-waitlist__button--ghost" href={tweet} target="_blank" rel="noreferrer">Tweet</a>
          <a className="hanzo-waitlist__button hanzo-waitlist__button--ghost" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
          <button type="button" className="hanzo-waitlist__button" onClick={copy}>Copy link</button>
        </div>
      )}
      <p className="hanzo-waitlist__hint">{p.entry.referralCount.toLocaleString()} referral{p.entry.referralCount === 1 ? '' : 's'}</p>
    </div>
  )
}
