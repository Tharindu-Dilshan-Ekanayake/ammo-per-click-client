/**
 * Things bought with Bux rather than Wins.
 *
 * A pass is bought once and kept forever, the way a Roblox game pass works — it is
 * not spent, it just flips something on. Wins buy guns, eggs, targets and boosts;
 * Bux buy these.
 *
 * ── Each `sku` has to exist and be ACTIVE in this game's Bloxity admin panel ──
 * The server is what prices a SKU; the client never sends a price. An unknown or
 * inactive SKU comes back from `requestPurchase` as
 *   `Product "<sku>" not found for game "<slug>"`
 * which the game surfaces as an error toast, so a missing catalog entry shows up
 * immediately rather than silently granting nothing.
 *
 * `bux` below is only a fallback for the signs: the game reads the live price from
 * the admin panel on start-up (see bloxity/prices.js) and shows that.
 *
 * The game server keeps the same list of SKUs (server/src/catalog.js). That is what
 * makes a pass stick: the purchase webhook records it against the player's account,
 * and a save that claims a pass the account never bought has it stripped out.
 */
export const PASSES = [
  {
    id: 'vipWins',
    sku: 'vip_wins_pad',
    name: 'VIP Wins Pad',
    bux: 99,
    blurb: 'Unlocks the blue VIP pad at every stage. Double Wins, no Ammo needed.',
    color: '#2fd4ff',
    emoji: '🏆',
  },
  {
    id: 'power2x',
    sku: 'pass_2x_power',
    name: '2x Power',
    bux: 149,
    blurb: 'Every click gives twice the Ammo. Forever, on top of everything else.',
    color: '#3fb6ff',
    emoji: '⚡',
  },
  {
    id: 'wins2x',
    sku: 'pass_2x_wins',
    name: '2x Wins',
    bux: 99,
    blurb: 'Every Win pad, boss and cave wall pays double. Forever.',
    color: '#ffd23f',
    emoji: '🏆',
  },
  {
    id: 'autoWins',
    sku: 'pass_auto_wins',
    name: 'Auto Wins',
    bux: 199,
    blurb: 'Collects your best stage’s Wins every 10 seconds while it is switched on.',
    color: '#ff5fb8',
    emoji: '🤖',
  },
]

export const getPass = (id) => PASSES.find((p) => p.id === id)

/** Multiplier from the 2x passes, for whichever of them `ownedPasses` holds. */
export const passMultiplier = (ownedPasses, id) => (ownedPasses?.includes(id) ? 2 : 1)

/**
 * Ammo packs: the one thing in the game bought with Bux that is spent rather than
 * kept. Each purchase drops `amount` Ammo straight onto the counter.
 *
 * Consumables never go through the server's entitlement list - there is nothing to
 * "own" afterwards. The webhook still records the transaction (for refunds and
 * support), and the Ammo itself is saved with the rest of the player's progress.
 */
export const AMMO_PACKS = [
  { id: 'ammo100k', sku: 'ammo_pack_100k', name: '100K Ammo', amount: 100000, bux: 9, colors: ['#ff5fe0', '#a43cf0'] },
  { id: 'ammo1m', sku: 'ammo_pack_1m', name: '1M Ammo', amount: 1000000, bux: 29, colors: ['#ff6a6a', '#d02b2b'] },
  { id: 'ammo10m', sku: 'ammo_pack_10m', name: '10M Ammo', amount: 10000000, bux: 79, colors: ['#ffd84a', '#ff4fd8'], op: true },
]
