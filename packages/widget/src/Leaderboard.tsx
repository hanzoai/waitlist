import { useCallback, useEffect, useMemo, useState } from 'react'
import { WaitlistClient, type LeaderboardEntry, type LeaderboardPage } from './client'

export interface WaitlistLeaderboardProps {
  /** Slug or id of the waitlist. */
  waitlist: string
  /** Base server URL. Defaults to current origin. */
  baseUrl?: string
  /** Entries per page. Default 25. */
  pageSize?: number
  /** Theme override ('auto' | 'light' | 'dark'). */
  theme?: 'auto' | 'light' | 'dark'
  /**
   * Highlight the row matching this email (typically the current viewer).
   * The widget's `Waitlist` component stores the joined email in
   * localStorage under `hanzo-waitlist:<slug>` — read it there to wire up.
   */
  highlightEmail?: string
  /** Optional className on the root container. */
  className?: string
  style?: React.CSSProperties
  /**
   * Custom renderer for the "email" cell. Default shows the masked email.
   * Use this to render avatars, social links, etc.
   */
  renderEmail?: (entry: LeaderboardEntry) => React.ReactNode
}

/**
 * Paginated leaderboard view of a waitlist. The widget itself stays per-user
 * (Join + your-rank); this is the public list view. Same monochrome surface,
 * same CSS variables, same brand-neutral design — drop in next to <Waitlist>.
 */
export function WaitlistLeaderboard(props: WaitlistLeaderboardProps) {
  const {
    waitlist,
    baseUrl,
    pageSize = 25,
    theme = 'auto',
    highlightEmail,
    className,
    style,
    renderEmail,
  } = props

  const client = useMemo(() => new WaitlistClient({ baseUrl }), [baseUrl])
  const [page, setPage] = useState(1)
  const [data, setData] = useState<LeaderboardPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (p: number) => {
    setBusy(true)
    setError(null)
    const res = await client.list({ waitlist, page: p, pageSize })
    if ('ok' in res && res.ok) {
      setData(res)
    } else {
      setError(res.message || 'failed to load')
    }
    setBusy(false)
  }, [client, pageSize, waitlist])

  useEffect(() => { load(page) }, [load, page])

  const themeAttr = theme === 'auto' ? undefined : theme
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  return (
    <div className={['hanzo-waitlist', className].filter(Boolean).join(' ')} data-theme={themeAttr} style={style}>
      <div className="hanzo-waitlist__card hanzo-waitlist-lb">
        <header className="hanzo-waitlist-lb__head">
          <div>
            <h3 className="hanzo-waitlist__title">Leaderboard</h3>
            <p className="hanzo-waitlist__subtitle">
              {total.toLocaleString()} on the list
            </p>
          </div>
          <Pager
            page={data?.page ?? page}
            totalPages={totalPages}
            busy={busy}
            onChange={setPage}
          />
        </header>

        {error && <p className="hanzo-waitlist__error" role="alert">{error}</p>}

        <ol className="hanzo-waitlist-lb__list" start={data ? (data.page - 1) * data.pageSize + 1 : 1}>
          {(data?.entries ?? []).map((e) => {
            const mine = highlightEmail && e.email.toLowerCase() === highlightEmail.toLowerCase()
            return (
              <li
                key={`${e.rank}-${e.email}`}
                className="hanzo-waitlist-lb__row"
                data-mine={mine ? 'true' : undefined}
              >
                <span className="hanzo-waitlist-lb__rank">#{e.rank.toLocaleString()}</span>
                <span className="hanzo-waitlist-lb__email">
                  {renderEmail ? renderEmail(e) : e.email}
                </span>
                <span className="hanzo-waitlist-lb__refs" aria-label={`${e.referralCount} referrals`}>
                  {e.referralCount.toLocaleString()}
                </span>
              </li>
            )
          })}
        </ol>

        {totalPages > 1 && (
          <footer className="hanzo-waitlist-lb__foot">
            <Pager
              page={data?.page ?? page}
              totalPages={totalPages}
              busy={busy}
              onChange={setPage}
            />
          </footer>
        )}
      </div>
    </div>
  )
}

function Pager(p: { page: number; totalPages: number; busy: boolean; onChange: (n: number) => void }) {
  const prev = () => p.onChange(Math.max(1, p.page - 1))
  const next = () => p.onChange(Math.min(p.totalPages, p.page + 1))
  return (
    <div className="hanzo-waitlist-lb__pager">
      <button
        type="button"
        className="hanzo-waitlist__button hanzo-waitlist__button--ghost"
        onClick={prev}
        disabled={p.busy || p.page <= 1}
        aria-label="Previous page"
      >&larr;</button>
      <span className="hanzo-waitlist-lb__pageinfo">
        {p.page.toLocaleString()} / {p.totalPages.toLocaleString()}
      </span>
      <button
        type="button"
        className="hanzo-waitlist__button hanzo-waitlist__button--ghost"
        onClick={next}
        disabled={p.busy || p.page >= p.totalPages}
        aria-label="Next page"
      >&rarr;</button>
    </div>
  )
}
