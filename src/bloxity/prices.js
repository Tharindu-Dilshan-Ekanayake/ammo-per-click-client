import { create } from 'zustand'

/**
 * Live Bux prices, read from the Bloxity admin panel.
 *
 * Every Bux item in the game carries a `bux` number, and that number is only ever a
 * fallback for the signs: the SDK charges whatever the admin panel says, looked up by
 * SKU, and never what the client shows. If the two drift apart the player is quoted
 * one price on the sign and charged another in the modal. So on start-up the game
 * asks the same public endpoint the SDK's purchase modal reads -
 * `GET /v1/games/<slug>/iaps/<sku>` - and the signs show that instead.
 *
 * A SKU that is missing or inactive in the admin panel 404s here, and keeps its
 * fallback price. Buying it will then fail with "Product not found", which is the
 * SDK telling you the IAP still needs creating - see the README's IAP table.
 */

const API_URL = import.meta.env.VITE_BLOXITY_API_URL || 'https://api.bloxity.io'

export const usePrices = create(() => ({
  /** sku -> price in Bux, for every SKU the admin panel answered for. */
  bySku: {},
}))

let loaded = null

/** Fetches every SKU's price once per page. Failures are silent: the fallback stands. */
export function loadPrices(gameSlug, skus) {
  if (loaded || !gameSlug || gameSlug === 'MY_GAME_SLUG') return loaded
  loaded = Promise.all(
    skus.map(async (sku) => {
      try {
        const res = await fetch(`${API_URL}/v1/games/${encodeURIComponent(gameSlug)}/iaps/${encodeURIComponent(sku)}`)
        if (!res.ok) return null
        const product = await res.json()
        return typeof product?.price === 'number' ? [sku, product.price] : null
      } catch {
        return null
      }
    }),
  ).then((entries) => {
    const bySku = Object.fromEntries(entries.filter(Boolean))
    usePrices.setState({ bySku })
    const missing = skus.filter((sku) => !(sku in bySku))
    if (missing.length) {
      console.warn(`[bloxity] these IAPs are not set up in the admin panel yet: ${missing.join(', ')}`)
    }
  })
  return loaded
}

/** The Bux price to show for `item` ({ sku, bux }): live if known, else its fallback. */
export const useBuxPrice = (item) => usePrices((s) => s.bySku[item?.sku]) ?? item?.bux

/** Same, outside React. */
export const buxPrice = (item) => usePrices.getState().bySku[item?.sku] ?? item?.bux
