import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BoxGeometry } from 'three'

import { setAimTarget } from '../aim'
import { BOSS_RESPAWN_S, BOSS_TIME_S, bossHp, bossSkin } from '../boss'
import { useBossFight } from '../bossFight'
import { formatNumber } from '../format'
import { useGame } from '../gameStore'
import { playSound } from '../sound'
import { Sparkle } from './Effects'
import { geometry, merge } from './geometry'
import { createDynamicLabel, createHpBar, HP_BAR_ASPECT, radialGlowTexture } from './textures'

/** The boss is modelled about four and a half units tall, then scaled up by this. */
const SCALE = 2.3
/** Where it stands relative to the arena's centre: on its plinth, at the south end. */
const BOSS_OFFSET = [0, 0.75, -12]
/** Its chest, in its own units: where the shots land and the tracers fly to. */
const CHEST_Y = 2.3
/** Delay from click to impact: the time the bullet takes to get there. */
const HIT_DELAY_S = 0.08
const FLASH_S = 0.15
const POPUP_COUNT = 8
const POPUP_S = 1
/** How often the HUD's copy of the fight (useBossFight) is refreshed. */
const PUBLISH_S = 0.1
const DEATH_S = 0.7
const RISE_S = 0.8

/**
 * The boss's body, split by material and merged: everything in its skin colour, the
 * armour plates, and the eyes. Built once; every level is the same shape recoloured.
 * Arms are left out - they swing, so they are their own meshes.
 */
const bossParts = () =>
  geometry('boss-body', () => {
    const box = (w, h, d, x, y, z, rz = 0) => {
      const g = new BoxGeometry(w, h, d)
      if (rz) g.rotateZ(rz)
      g.translate(x, y, z)
      return g
    }
    return {
      body: merge([box(2, 1.8, 1.2, 0, 2.3, 0), box(1.3, 1.1, 1.1, 0, 3.85, 0)]),
      armor: merge([
        box(0.7, 1.4, 0.7, -0.5, 0.7, 0),
        box(0.7, 1.4, 0.7, 0.5, 0.7, 0),
        box(1.2, 0.9, 0.1, 0, 2.2, 0.62),
        box(2.2, 0.35, 1.3, 0, 3.1, 0),
        box(0.22, 0.55, 0.22, -0.45, 4.6, 0, 0.35),
        box(0.22, 0.55, 0.22, 0.45, 4.6, 0, -0.35),
        box(0.7, 0.12, 0.05, 0, 3.55, 0.56),
      ]),
      eyes: merge([box(0.32, 0.18, 0.06, -0.3, 3.95, 0.56), box(0.32, 0.18, 0.06, 0.3, 3.95, 0.56)]),
      arm: merge([box(0.55, 1.6, 0.55, 0, -0.8, 0), box(0.8, 0.7, 0.8, 0, -1.75, 0)]),
    }
  })

/** Seconds left on the clock as "0:42". */
const clockText = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`

/**
 * The boss arena's fight: the boss itself, its health bar and clock, and the sensor
 * that knows when the player is inside.
 *
 * One boss at a time, local to each player like the stage walls. It waits until the
 * first shot, then the clock runs; every shot after that lands as damage equal to the
 * Ammo it earned (see game/boss.js). Beat it in time and it falls, pays out, and the
 * next level steps in a few seconds later. Run out of time and it heals in full.
 *
 * @param {{ position: number[], arenaHalf: number }} props the arena's centre and half-size
 */
export function BossArena({ position, arenaHalf }) {
  const level = useGame((s) => s.bossLevel)
  const skin = bossSkin(level)
  const parts = bossParts()
  const at = useMemo(
    () => [position[0] + BOSS_OFFSET[0], position[1] + BOSS_OFFSET[1], position[2] + BOSS_OFFSET[2]],
    [position],
  )
  const chest = useMemo(() => [at[0], at[1] + CHEST_Y * SCALE, at[2]], [at])

  const bar = useMemo(() => createHpBar(), [])
  const header = useMemo(() => createDynamicLabel({ aspect: 4, width: 512 }), [])
  const popupLabels = useMemo(
    () => Array.from({ length: POPUP_COUNT }, () => createDynamicLabel({ aspect: 2.6, width: 256 })),
    [],
  )
  useEffect(
    () => () => {
      bar.texture.dispose()
      header.texture.dispose()
      popupLabels.forEach((label) => label.texture.dispose())
    },
    [bar, header, popupLabels],
  )

  const rig = useRef(null)
  const armL = useRef(null)
  const armR = useRef(null)
  const bodyMat = useRef(null)
  const glow = useRef(null)
  const popups = useRef([])

  const fx = useRef({
    level: 0,
    hp: 0,
    phase: 'waiting',
    startedAt: 0,
    downAt: 0,
    seenShot: -Infinity,
    pending: [],
    hitAt: -Infinity,
    shownHp: -1,
    shownClock: '',
    publishedAt: -Infinity,
    nextPopup: 0,
    popupAt: [],
    popupX: [],
  })

  useFrame(({ camera, clock }) => {
    const now = performance.now() / 1000
    const s = fx.current
    const game = useGame.getState()
    const maxHp = bossHp(game.bossLevel)

    // A new level (first mount, or the last one fell): full health, waiting.
    if (s.level !== game.bossLevel && s.phase !== 'down') {
      s.level = game.bossLevel
      s.hp = maxHp
      s.phase = 'waiting'
    }

    if (game.inBossArena && s.phase !== 'down') setAimTarget(chest)

    // Shots fired while in the arena, each landing a moment later.
    if (game.inBossArena && game.shotAt > s.seenShot && now - game.shotAt < 0.2 && s.phase !== 'down') {
      s.seenShot = game.shotAt
      s.pending.push([game.shotAt + HIT_DELAY_S, game.lastGain])
    }
    while (s.pending.length && now >= s.pending[0][0]) {
      const [, damage] = s.pending.shift()
      if (s.phase === 'down') continue
      if (s.phase === 'waiting') {
        s.phase = 'fighting'
        s.startedAt = now
        playSound('bossRoar')
      }
      s.hp -= damage
      s.hitAt = now
      playSound('bossHit')
      const i = s.nextPopup
      s.nextPopup = (i + 1) % POPUP_COUNT
      s.popupAt[i] = now
      s.popupX[i] = (Math.random() - 0.5) * 3
      popupLabels[i].draw({ lines: [{ text: `-${formatNumber(damage)}`, icon: 'ammo', fill: ['#ffffff', '#ffb347'] }] })
      const mesh = popups.current[i]
      if (mesh && mesh.material.map !== popupLabels[i].texture) {
        mesh.material.map = popupLabels[i].texture
        mesh.material.needsUpdate = true
      }
      if (s.hp <= 0) {
        s.hp = 0
        s.phase = 'down'
        s.downAt = now
        s.pending.length = 0
        playSound('wallBreak')
        playSound('stage')
        game.defeatBoss(s.level)
      }
    }

    // Out of time: it shrugs it off and heals.
    if (s.phase === 'fighting' && now - s.startedAt >= BOSS_TIME_S) {
      s.phase = 'waiting'
      s.hp = maxHp
      playSound('bossRoar')
      game.notify(`Out of time - the boss healed! Get more Ammo per click and try again`, 'error')
    }
    // Back up again after a breather, one level higher.
    if (s.phase === 'down' && now - s.downAt >= BOSS_RESPAWN_S) {
      s.level = game.bossLevel
      s.hp = bossHp(s.level)
      s.phase = 'waiting'
      s.risenAt = now
      if (game.inBossArena) playSound('bossRoar')
    }

    // --- Looks ------------------------------------------------------------------
    const t = clock.elapsedTime
    const g = rig.current
    if (g) {
      const downFor = now - s.downAt
      const risenFor = now - (s.risenAt ?? -Infinity)
      let scale = SCALE
      if (s.phase === 'down') scale = SCALE * Math.max(0, 1 - downFor / DEATH_S)
      else if (risenFor < RISE_S) scale = SCALE * (risenFor / RISE_S)
      g.scale.setScalar(Math.max(0.0001, scale))
      g.visible = scale > 0.001
      g.rotation.y = s.phase === 'down' ? downFor * 8 : Math.sin(t * 0.7) * 0.15
      g.position.y = at[1] + (s.phase === 'fighting' ? Math.abs(Math.sin(t * 3)) * 0.4 : Math.sin(t * 1.4) * 0.15)
    }
    const swingRate = s.phase === 'fighting' ? 4 : 1.3
    if (armL.current) armL.current.rotation.x = Math.sin(t * swingRate) * 0.6
    if (armR.current) armR.current.rotation.x = -Math.sin(t * swingRate) * 0.6
    const flash = Math.max(0, 1 - (now - s.hitAt) / FLASH_S)
    if (bodyMat.current) bodyMat.current.emissiveIntensity = 0.15 + flash * 0.9
    if (glow.current) glow.current.opacity = s.phase === 'fighting' ? 0.45 + 0.15 * Math.sin(t * 6) : 0.3

    // The board over its head: name and level, health, and the clock.
    const left = s.phase === 'fighting' ? BOSS_TIME_S - (now - s.startedAt) : BOSS_TIME_S
    const clockLine = s.phase === 'down' ? 'DEFEATED!' : s.phase === 'waiting' ? 'Shoot to start!' : `⏱ ${clockText(left)}`
    const shownHp = Math.ceil(s.hp)
    if (shownHp !== s.shownHp) {
      s.shownHp = shownHp
      bar.draw(shownHp, bossHp(s.level || game.bossLevel))
    }
    if (clockLine !== s.shownClock || s.shownLevel !== s.level) {
      s.shownClock = clockLine
      s.shownLevel = s.level
      header.draw({
        lines: [
          { text: `${bossSkin(s.level || 1).name} · Lv ${s.level || 1}`, fill: ['#ffffff', '#ffb0b0'] },
          { text: clockLine, scale: 0.8, fill: s.phase === 'fighting' && left < 10 ? '#ff6a6a' : '#fff3a0' },
        ],
      })
    }

    if (now - s.publishedAt >= PUBLISH_S) {
      s.publishedAt = now
      useBossFight.setState({
        phase: s.phase,
        level: s.level || game.bossLevel,
        hp: shownHp,
        maxHp: bossHp(s.level || game.bossLevel),
        endsAt: (s.startedAt + BOSS_TIME_S) * 1000,
        nextAt: (s.downAt + BOSS_RESPAWN_S) * 1000,
      })
    }

    popups.current.forEach((popup, i) => {
      if (!popup) return
      const age = now - (s.popupAt[i] ?? -Infinity)
      popup.visible = age >= 0 && age < POPUP_S
      if (!popup.visible) return
      popup.position.set(at[0] + s.popupX[i], chest[1] + 2 + age * 3, at[2] + 3)
      popup.material.opacity = 1 - (age / POPUP_S) ** 2
      popup.quaternion.copy(camera.quaternion)
    })
  })

  const half = arenaHalf - 1
  const onEnter = ({ other }) => {
    if (other.rigidBodyObject?.name === 'player') useGame.getState().setInBossArena(true)
  }
  const onExit = ({ other }) => {
    if (other.rigidBodyObject?.name !== 'player') return
    useGame.getState().setInBossArena(false)
    setAimTarget(null)
  }

  return (
    <group>
      <group ref={rig} position={at} scale={SCALE}>
        <mesh geometry={parts.body} castShadow>
          <meshStandardMaterial
            ref={bodyMat}
            color={skin.body}
            emissive="#ffffff"
            emissiveIntensity={0.15}
            roughness={0.6}
          />
        </mesh>
        <mesh geometry={parts.armor} castShadow>
          <meshStandardMaterial color={skin.armor} metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh geometry={parts.eyes}>
          <meshBasicMaterial color={skin.eye} toneMapped={false} />
        </mesh>
        <group ref={armL} position={[-1.35, 3.05, 0]}>
          <mesh geometry={parts.arm} castShadow>
            <meshStandardMaterial color={skin.armor} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
        <group ref={armR} position={[1.35, 3.05, 0]}>
          <mesh geometry={parts.arm} castShadow>
            <meshStandardMaterial color={skin.armor} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* A red glow behind it, brighter while the clock runs. */}
      <Billboard position={chest}>
        <mesh>
          <planeGeometry args={[14, 14]} />
          <meshBasicMaterial
            ref={glow}
            map={radialGlowTexture()}
            color={skin.eye}
            transparent
            opacity={0.3}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
      <Sparkle count={30} scale={[8, 10, 6]} position={chest} size={8} speed={0.6} color={skin.eye} />

      <Billboard position={[at[0], at[1] + 5.3 * SCALE, at[2]]}>
        <mesh position={[0, 1.1, 0]}>
          <planeGeometry args={[7, 1.75]} />
          <meshBasicMaterial map={header.texture} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[6, 6 / HP_BAR_ASPECT]} />
          <meshBasicMaterial map={bar.texture} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </Billboard>

      {Array.from({ length: POPUP_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            popups.current[i] = el
          }}
          visible={false}
          renderOrder={2}
        >
          <planeGeometry args={[3.4, 1.3]} />
          <meshBasicMaterial transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        {/* Solid, so nobody walks through it. */}
        <CuboidCollider args={[1.2 * SCALE, 2.3 * SCALE, 0.8 * SCALE]} position={[at[0], at[1] + 2.3 * SCALE, at[2]]} />
        <CuboidCollider
          sensor
          args={[half, 6, half]}
          position={[position[0], 6, position[2]]}
          onIntersectionEnter={onEnter}
          onIntersectionExit={onExit}
        />
      </RigidBody>
    </group>
  )
}

export default BossArena
