import { useEffect } from 'react'

import { useBloxity } from '../bloxity/BloxityContext'
import { refreshBalance, topUp, useBux } from '../bloxity/bux'
import { formatNumber } from '../game/format'
import { useCloud } from '../game/cloudSave'

/** How often the balance is re-read while signed in: Bux can be topped up in the portal too. */
const BALANCE_REFRESH_MS = 60000

/** Bloxity's Bux gem, in the same chunky outlined style as the HUD's icons. */
function BuxGem({ className }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="auth-bux" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bdf3ff" />
          <stop offset="1" stopColor="#0f87ff" />
        </linearGradient>
      </defs>
      <g stroke="#1b1b25" strokeWidth="8" strokeLinejoin="round">
        <path d="M28 10 H72 L94 40 L50 92 L6 40 Z" fill="url(#auth-bux)" />
        <path d="M6 40 H94" fill="none" strokeWidth="6" />
      </g>
    </svg>
  )
}

/**
 * How many Bux the signed-in account has, beside the name tag, with a "+" that opens
 * the SDK's top-up window. "…" until the first read lands, rather than a "0" that
 * would read as "you're broke".
 */
function BuxBalance() {
  const balance = useBux((s) => s.balance)
  const busy = useBux((s) => s.busy)
  useEffect(() => {
    const id = setInterval(() => refreshBalance(), BALANCE_REFRESH_MS)
    return () => clearInterval(id)
  }, [])
  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-black/65 py-1 pl-1.5 pr-1 ring-1 ring-white/15 backdrop-blur"
      title="Your Bux"
    >
      <BuxGem className="h-6 w-6" />
      <span key={balance} className="power-bump min-w-6 text-sm font-semibold text-sky-200">
        {balance === null ? '…' : formatNumber(balance)}
      </span>
      <button
        type="button"
        onClick={() => topUp()}
        disabled={busy}
        title="Top up Bux"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-sky-500 pb-0.5 text-lg leading-none text-white transition hover:bg-sky-400 active:translate-y-0.5 disabled:opacity-50"
      >
        +
      </button>
    </div>
  )
}

/** What the cloud mark beside your name says, and in what colour. */
const CLOUD = {
  loading: ['Loading…', 'text-sky-200'],
  saving: ['Saving…', 'text-sky-200'],
  saved: ['Saved', 'text-lime-300'],
  offline: ['Not saved yet', 'text-amber-300'],
}

/**
 * Who you are, top-right: a picture and a name in one small pill.
 *
 * Shaped after the portal's own player chip - avatar tucked inside the left end of
 * a rounded pill, name beside it, nothing else. No "signed in" line and no log-out
 * control: signing out belongs to the Bloxity portal rather than to a button a
 * player can knock in the middle of a run. Signed in, the account's Bux balance sits
 * just left of it, with a "+" to top up.
 *
 * Signed out the same pill becomes the button that opens the login, so the corner
 * keeps one shape in one place either way. Signed in, a small cloud mark beside the
 * name says whether your progress has reached the game server (see game/cloudSave.js).
 *
 * Uses the `getUser() || getGuest()` pattern (surfaced as `identity` on the context)
 * so there is a name and picture to show even before the player logs in.
 */
export function AuthHUD() {
  const { identity, isLoggedIn, login, status, error } = useBloxity()
  const cloud = CLOUD[useCloud((s) => s.status)]

  const name = identity?.displayName || identity?.username || 'Guest'
  const pfp = identity?.pfp
  const connecting = status !== 'ready'

  /** The pill itself: dark, rounded all the way, avatar flush into the left end. */
  const pill = 'flex items-center gap-2 rounded-full bg-black/65 py-1 pl-1 pr-4 ring-1 ring-white/15 backdrop-blur'

  const avatar = pfp ? (
    <img src={pfp} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/25" />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white ring-2 ring-white/25">
      {name.charAt(0).toUpperCase()}
    </div>
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end p-4">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <BuxBalance />
            <div className={pill}>
              {avatar}
              <span className="text-sm font-semibold text-white">{name}</span>
              {cloud && <span className={`text-xs font-semibold ${cloud[1]}`}>☁ {cloud[0]}</span>}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={login}
            disabled={connecting}
            className={`${pill} transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {avatar}
            <span className="text-sm font-semibold text-white">
              {connecting ? 'Connecting…' : 'Log in with Bloxity'}
            </span>
          </button>
        )}

        {status === 'error' && (
          <div className="max-w-xs rounded-lg bg-red-600/80 px-3 py-2 text-xs text-white">
            Bloxity SDK failed to load. {error?.message}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthHUD
