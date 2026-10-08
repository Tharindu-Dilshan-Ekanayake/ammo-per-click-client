import { tidy } from './format'

/**
 * Boss balance. The arena (world/BossArena.jsx) holds one boss at a time; beat it
 * before the clock runs out and the next one is a level higher, tougher and better
 * paid. Lose, and the same boss heals and waits for another go.
 *
 * Every shot deals the Ammo that shot earned - the same number that flies up to the
 * counter - so the things that make clicks bigger (guns, rebirths, levels, boosts,
 * the 2x Power pass) are the things that win fights. Targets do not: you cannot
 * stand on a target's pad inside the arena.
 */

/** Seconds a fight lasts from the first shot. */
export const BOSS_TIME_S = 60

/** Seconds before the next boss steps in after one falls. */
export const BOSS_RESPAWN_S = 6

/**
 * Health at `level`. Level 1 falls to a fresh rebirth's gun on auto-click inside the
 * minute; each level after wants about three times the damage.
 */
export const bossHp = (level) => tidy(2000000 * 3 ** (level - 1))

/** Wins for beating the boss at `level`, before pets and the 2x Wins pass. */
export const bossReward = (level) => tidy(2000 * 3.2 ** (level - 1))

/** The look of the boss at `level`: the colours cycle so each level reads as new. */
const SKINS = [
  { name: 'Brute Bot', body: '#d23a3a', armor: '#3a3a48', eye: '#ffe14a' },
  { name: 'Toxic Titan', body: '#46c13a', armor: '#2a3a2a', eye: '#e4ff3a' },
  { name: 'Frost Golem', body: '#7fd8ff', armor: '#2a4a6a', eye: '#ffffff' },
  { name: 'Void Lord', body: '#7a3ad8', armor: '#1a1030', eye: '#ff4fd8' },
  { name: 'Magma King', body: '#ff7a1f', armor: '#3a1408', eye: '#ffd166' },
]
export const bossSkin = (level) => SKINS[(level - 1) % SKINS.length]
