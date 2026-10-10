import { useEffect, useState } from 'react'

/**
 * Whether this is a phone or a tablet - which is to say, whether the on-screen
 * controls should be there.
 *
 * The test is what the *primary* pointer can do, not whether a touchscreen exists
 * anywhere. `pointer: coarse` is true for a finger and false for a mouse or
 * trackpad, and a touchscreen laptop still reports `fine` because its main pointer
 * is the trackpad - so a desktop player never gets a thumbstick over their game,
 * while a tablet with a stylus or a keyboard case still does.
 *
 * `?touch=1` in the URL forces it on and `?touch=0` off, which is the only way to
 * try the other layout on the machine you are building it on.
 */
const forced = (() => {
  if (typeof location === 'undefined') return null
  const value = new URLSearchParams(location.search).get('touch')
  return value === null ? null : value !== '0'
})()

const QUERY = '(pointer: coarse)'

export function isTouchDevice() {
  if (forced !== null) return forced
  if (typeof matchMedia !== 'function') return false
  return matchMedia(QUERY).matches
}

/**
 * The same thing as React state, kept up to date. It can genuinely change mid-session
 * - a tablet gaining a mouse, a phone docked to a desk - and the controls should
 * follow rather than be decided once at load.
 */
export function useTouchDevice() {
  const [touch, setTouch] = useState(isTouchDevice)

  useEffect(() => {
    if (forced !== null || typeof matchMedia !== 'function') return
    const media = matchMedia(QUERY)
    const onChange = () => setTouch(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return touch
}

/**
 * A screen too small for the full-size HUD, whatever is driving it.
 *
 * The game does not only run full screen on a phone: it runs in an iframe on the
 * Bloxity game page, in a browser tab someone has shrunk, in a split window. In all
 * of those a mouse is the pointer, so `useTouchDevice` says "desktop" and the HUD is
 * drawn at the size it was designed for a monitor - and its pieces land on top of
 * each other, the Ammo counter across the shop button and the level bar across the
 * controls. So the HUD and its panels ask this instead: the compact layout is for a
 * touch device or a small window, and only the thumbstick and buttons (TouchControls)
 * are left to follow the pointer.
 */
const COMPACT_H = 640
const COMPACT_W = 820

const measureCompact = () =>
  typeof window !== 'undefined' && (window.innerHeight < COMPACT_H || window.innerWidth < COMPACT_W)

export function useCompactLayout() {
  const touch = useTouchDevice()
  const [small, setSmall] = useState(measureCompact)

  useEffect(() => {
    const onResize = () => setSmall(measureCompact())
    onResize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return touch || small
}
