import { create } from 'zustand'

/**
 * The boss fight as the HUD sees it, written by the arena (world/BossArena.jsx).
 *
 * The arena keeps the exact health in a ref, changing every shot; this is a copy it
 * publishes a few times a second, which is all a health bar and a countdown need and
 * keeps the HUD from re-rendering at the auto clicker's rate.
 *
 * phase: 'waiting' - the boss is up and nobody has fired yet; the clock has not started
 *        'fighting' - the clock is running
 *        'down'     - beaten; the next one steps in at `nextAt`
 */
export const useBossFight = create(() => ({
  phase: 'waiting',
  level: 1,
  hp: 0,
  maxHp: 1,
  /** `performance.now()` ms the clock runs out, while fighting. */
  endsAt: 0,
  /** `performance.now()` ms the next boss arrives, while down. */
  nextAt: 0,
}))
