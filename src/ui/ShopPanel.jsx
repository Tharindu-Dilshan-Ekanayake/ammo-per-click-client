import { useEffect } from 'react'

import { useBuxPrice } from '../bloxity/prices'
import { useTouchDevice } from '../game/device'
import { useGame } from '../game/gameStore'
import { AMMO_PACKS, getPass, PASSES } from '../game/passes'
import { CHIP, OUTLINE } from './textStyle'

/**
 * Everything bought with Bux that is not standing somewhere in the world: the passes
 * and the Ammo packs. Guns, targets and the Exclusive egg are sold where they stand,
 * on their VIP platforms; the shop says so at the bottom rather than duplicating them.
 *
 * Every price here is the live one from the admin panel (see bloxity/prices.js), and
 * every button goes through the same `buyWithBux` the world's VIP items do - the SDK
 * draws the confirm modal and takes the payment.
 */

const INK = '#1b1b25'
/** See RebirthPanel: emoji need a shadow to sit with the outlined text. */
const EMOJI = { filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 6px rgba(0,0,0,0.35))' }

/** The Bux gem with a price, as every buy button wears it. */
function Price({ item, className = '' }) {
  const bux = useBuxPrice(item)
  return (
    <span className={`flex items-center gap-1 ${className}`}>
      <span style={EMOJI} aria-hidden>
        💎
      </span>
      {bux}
    </span>
  )
}

function ShopButtonFace({ colors, onClick, disabled, className = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`pointer-events-auto relative cursor-pointer rounded-xl border-4 text-white transition duration-100 hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] disabled:cursor-default disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:brightness-100 ${className}`}
      style={{
        ...OUTLINE,
        borderColor: INK,
        background: `linear-gradient(to bottom, ${colors[0]}, ${colors[1]})`,
        boxShadow: 'inset 0 -5px 0 rgba(0,0,0,0.22), 0 4px 0 rgba(0,0,0,0.45)',
      }}
    >
      <span className="pointer-events-none absolute inset-x-3 top-1 h-1.5 rounded-full bg-white/35" />
      {children}
    </button>
  )
}

/** One pass: what it does, and Buy - or Owned, or (for Auto Wins) a switch. */
function PassRow({ pass, touch }) {
  const owned = useGame((s) => s.ownedPasses.includes(pass.id))
  const autoWins = useGame((s) => s.autoWins)
  const buy = () => useGame.getState().buyPass(pass.id)
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border-4 ${touch ? 'p-1.5' : 'p-2.5'}`}
      style={{ borderColor: INK, background: 'linear-gradient(to bottom, #3a3060, #2a2248)' }}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg border-2 ${touch ? 'h-10 w-10 text-2xl' : 'h-14 w-14 text-4xl'}`}
        style={{ ...EMOJI, borderColor: INK, background: pass.color }}
        aria-hidden
      >
        {pass.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-white ${touch ? 'text-base' : 'text-2xl'}`} style={OUTLINE}>
          {pass.name}
        </div>
        <div className={`text-white/75 ${touch ? 'text-[10px] leading-tight' : 'text-sm'}`} style={CHIP}>
          {pass.blurb}
        </div>
      </div>
      {owned ? (
        pass.id === 'autoWins' ? (
          <ShopButtonFace
            colors={autoWins ? ['#7ce86a', '#2f9e44'] : ['#ff6a6a', '#d02b2b']}
            onClick={() => useGame.getState().toggleAutoWins()}
            className={touch ? 'px-2 py-1 text-sm' : 'px-4 py-2 text-xl'}
          >
            {autoWins ? 'ON' : 'OFF'}
          </ShopButtonFace>
        ) : (
          <span className={`shrink-0 text-lime-300 ${touch ? 'text-sm' : 'text-xl'}`} style={OUTLINE}>
            OWNED
          </span>
        )
      ) : (
        <ShopButtonFace
          colors={['#3fb6ff', '#0f6fd8']}
          onClick={buy}
          className={touch ? 'px-2 py-1 text-sm' : 'px-4 py-2 text-xl'}
        >
          <Price item={pass} />
        </ShopButtonFace>
      )}
    </div>
  )
}

/** One Ammo pack: the amount, big, and its price. */
function PackButton({ pack, touch }) {
  return (
    <ShopButtonFace
      colors={pack.colors}
      onClick={() => useGame.getState().buyAmmoPack(pack.id)}
      className={`flex flex-1 flex-col items-center ${touch ? 'px-1 py-1.5' : 'px-2 py-3'}`}
    >
      {pack.op && (
        <span
          className="absolute -right-2 -top-3 rounded-md border-2 px-1.5 text-xs"
          style={{ ...CHIP, borderColor: INK, background: '#ff3b6b' }}
        >
          OP
        </span>
      )}
      <span className={touch ? 'text-base' : 'text-2xl'}>{pack.name}</span>
      <Price item={pack} className={touch ? 'text-sm' : 'text-xl'} />
    </ShopButtonFace>
  )
}

function ShopDialog() {
  const touch = useTouchDevice()
  const close = () => useGame.getState().toggleShop(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') useGame.getState().toggleShop(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className={`w-full rounded-2xl border-4 ${touch ? 'max-w-md p-2' : 'max-w-2xl p-4'}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          borderColor: INK,
          background: 'linear-gradient(to bottom, #4a3a7a, #2e2452)',
          boxShadow: '0 10px 0 rgba(0,0,0,0.45)',
        }}
      >
        <div className={`flex items-center justify-between ${touch ? 'mb-2' : 'mb-4'}`}>
          <span className={`text-white ${touch ? 'text-2xl' : 'text-4xl'}`} style={OUTLINE}>
            🛒 Shop
          </span>
          <ShopButtonFace colors={['#ff6a6a', '#d02b2b']} onClick={close} className={touch ? 'px-3 py-1 text-lg' : 'px-4 py-2 text-2xl'}>
            &#10006;
          </ShopButtonFace>
        </div>

        <div className={`flex flex-col ${touch ? 'gap-1.5' : 'gap-2.5'}`}>
          {PASSES.map((pass) => (
            <PassRow key={pass.id} pass={pass} touch={touch} />
          ))}
        </div>

        <div className={`text-white ${touch ? 'mb-1 mt-3 text-lg' : 'mb-2 mt-5 text-2xl'}`} style={OUTLINE}>
          Ammo packs
        </div>
        <div className={`flex ${touch ? 'gap-1.5 pt-2' : 'gap-3 pt-3'}`}>
          {AMMO_PACKS.map((pack) => (
            <PackButton key={pack.id} pack={pack} touch={touch} />
          ))}
        </div>

        <div className={`text-center text-white/70 ${touch ? 'mt-2 text-[10px]' : 'mt-4 text-sm'}`} style={CHIP}>
          VIP guns, VIP targets and the Exclusive egg are on their gold platforms in the lobby.
          Passes are yours for good, on every device you log in on.
        </div>
      </div>
    </div>
  )
}

export function ShopPanel() {
  const open = useGame((s) => s.shopOpen)
  return open ? <ShopDialog /> : null
}

/** The left-rail button that opens the shop. */
export function ShopButton() {
  const touch = useTouchDevice()
  return (
    <button
      type="button"
      onClick={() => useGame.getState().toggleShop()}
      className={`pointer-events-auto relative mt-0 flex cursor-pointer flex-col items-center justify-center rounded-xl transition duration-100 hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 active:translate-y-0.5 active:scale-[0.98] ${
        touch ? 'h-12 w-12 border-2' : 'h-[4.5rem] w-[4.5rem] border-4'
      }`}
      style={{
        borderColor: INK,
        background: 'linear-gradient(to bottom, #ff7ad8, #e0309a)',
        boxShadow: 'inset 0 -5px 0 rgba(0,0,0,0.22), 0 4px 0 rgba(0,0,0,0.45)',
      }}
    >
      <span className="pointer-events-none absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/35" />
      <span className="pointer-events-none absolute -left-2 -top-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-md border-2 px-1 text-[11px] text-white" style={{ ...CHIP, borderColor: INK, background: '#f0a000' }}>B</span>
      <span className={touch ? 'text-2xl' : 'text-4xl'} style={EMOJI} aria-hidden>
        🛒
      </span>
      <span className={`text-white ${touch ? 'text-[11px]' : 'text-sm'}`} style={CHIP}>
        Shop
      </span>
    </button>
  )
}

/**
 * The two big offers down the right edge, the way the reference game shows them:
 * "2x Power" and "2x Wins", each with its price and "Permanent!". Each one goes away
 * once it is owned - an advert for something you have is clutter.
 */
export function PromoStack() {
  const touch = useTouchDevice()
  const owned = useGame((s) => s.ownedPasses)
  const offers = ['power2x', 'wins2x'].filter((id) => !owned.includes(id)).map(getPass)
  if (offers.length === 0) return null
  return (
    <div
      className={`pointer-events-none absolute z-10 flex flex-col items-end ${
        touch ? 'right-2 top-28 gap-2' : 'right-4 top-1/2 -translate-y-1/2 gap-4'
      }`}
    >
      {offers.map((pass) => {
        const powerPass = pass.id === 'power2x'
        const colors = powerPass ? ['#70dcff', '#1374d4'] : ['#fff27a', '#f0a000']
        const accent = powerPass ? '#55c8ff' : '#ffd84a'
        const buy = () => useGame.getState().buyPass(pass.id)

        if (touch) {
          return (
            <div key={pass.id} className="w-32">
              <ShopButtonFace
                colors={colors}
                onClick={buy}
                className="flex h-10 w-full items-center justify-between gap-1 px-1.5 text-[11px]"
              >
                <span className="whitespace-nowrap">{pass.name}</span>
                <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-yellow-100">
                  <Price item={pass} />
                </span>
              </ShopButtonFace>
              <div className="mt-0.5 text-center text-[8px] text-amber-100" style={CHIP}>
                PERMANENT
              </div>
            </div>
          )
        }

        return (
          <div
            key={pass.id}
            className="pointer-events-auto w-56 rounded-2xl border-2 p-1.5 shadow-xl backdrop-blur-sm"
            style={{
              borderColor: accent,
              background: powerPass
                ? 'linear-gradient(145deg, rgba(18, 71, 112, 0.96), rgba(12, 35, 65, 0.96))'
                : 'linear-gradient(145deg, rgba(112, 76, 10, 0.97), rgba(54, 36, 7, 0.97))',
              boxShadow: `0 0 16px ${powerPass ? 'rgba(55, 177, 255, 0.28)' : 'rgba(255, 190, 35, 0.28)'}, 0 6px 0 rgba(0,0,0,0.4)`,
            }}
          >
            <ShopButtonFace
              colors={colors}
              onClick={buy}
              className="w-full px-2 py-2 text-3xl"
            >
              {pass.name}
            </ShopButtonFace>
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-white/15 bg-black/25 px-2 py-1">
              <span className="text-xs text-white/80" style={CHIP}>
                ONLY
              </span>
              <span className="flex items-center gap-1 text-base text-yellow-200" style={OUTLINE}>
                <Price item={pass} />
              </span>
            </div>
            <div className="mt-1 text-center text-xs text-amber-200" style={CHIP}>
              PERMANENT
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Auto Wins, top centre, where the reference game keeps it: on or off once owned,
 * and a way to buy it before then.
 */
export function AutoWinsButton() {
  const touch = useTouchDevice()
  const owned = useGame((s) => s.ownedPasses.includes('autoWins'))
  const on = useGame((s) => s.autoWins && owned)
  const bestWall = useGame((s) => s.bestWall)
  const stageWinsNote = bestWall >= 10 ? null : 'clear stage 1 first'
  return (
    <div className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 ${touch ? 'top-2' : 'top-3'}`}>
      <ShopButtonFace
        colors={on ? ['#7ce86a', '#2f9e44'] : ['#ff6a8a', '#d0284a']}
        onClick={() => useGame.getState().toggleAutoWins()}
        className={touch ? 'px-2 py-0.5 text-sm' : 'px-5 py-1.5 text-2xl'}
      >
        <span
          className={`absolute -right-2 ${touch ? '-top-2 text-[10px]' : '-top-3 text-sm'}`}
          style={OUTLINE}
        >
          {owned ? (on ? 'ON' : 'OFF') : <Price item={getPass('autoWins')} />}
        </span>
        Auto Wins
      </ShopButtonFace>
      {on && stageWinsNote && (
        <div className={`text-center text-white/80 ${touch ? 'text-[9px]' : 'text-xs'}`} style={CHIP}>
          {stageWinsNote}
        </div>
      )}
      {on && !stageWinsNote && (
        <div className={`text-center text-lime-300 ${touch ? 'text-[9px]' : 'text-xs'}`} style={CHIP}>
          +Wins every 10s
        </div>
      )}
    </div>
  )
}

export default ShopPanel
