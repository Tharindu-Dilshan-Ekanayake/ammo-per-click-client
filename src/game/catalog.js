import { EGGS } from './eggs'
import { GUNS } from './guns'
import { PASSES } from './passes'
import { TRAINERS } from './trainers'

/**
 * Every Bux product in the game, in one list: what kind of thing it is, the id the
 * game knows it by, and the SKU the Bloxity admin panel sells it under.
 *
 * The game server keeps the same table (server/src/catalog.js) and the two must
 * agree - it is how the server knows that `gun_phantom_blaster` means the gun
 * `phantom`, and so which ids in a save need a purchase behind them. Add a Bux item
 * here and there, and as an IAP in the admin panel, or it cannot be bought.
 */
export const BUX_ITEMS = [
  ...GUNS.filter((g) => g.bux).map((g) => ({ kind: 'gun', id: g.id, sku: g.sku, name: g.name, bux: g.bux })),
  ...TRAINERS.filter((t) => t.bux).map((t) => ({ kind: 'trainer', id: t.id, sku: t.sku, name: t.name, bux: t.bux })),
  ...EGGS.filter((e) => e.bux).map((e) => ({ kind: 'pet', id: e.id, sku: e.sku, name: e.name, bux: e.bux })),
  ...PASSES.map((p) => ({ kind: 'pass', id: p.id, sku: p.sku, name: p.name, bux: p.bux })),
]

export const ALL_SKUS = BUX_ITEMS.map((item) => item.sku)
