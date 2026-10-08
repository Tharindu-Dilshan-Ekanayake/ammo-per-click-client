import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, BoxGeometry, CylinderGeometry } from 'three'

import { aim } from './aim'
import { geometry, merge } from './world/geometry'
import { radialGlowTexture } from './world/textures'

/** How much brighter the trim flares on the shot. */
const FLASH_BOOST = 1.6
/** Muzzle flash size at full strength, in model units (before the gun's `size`). */
const MUZZLE_SIZE = 0.75

/** A box `w` x `h` x `d` centred on (x, y, z), tilted `rx` about X. */
const box = (w, h, d, x, y, z, rx = 0) => {
  const g = new BoxGeometry(w, h, d)
  if (rx) g.rotateX(rx)
  g.translate(x, y, z)
  return g
}

/** A cylinder of radius `r` and length `len` lying along Z, centred on (x, y, z). */
const tube = (r, len, x, y, z, sides = 10) => {
  const g = new CylinderGeometry(r, r, len, sides)
  g.rotateX(Math.PI / 2)
  g.translate(x, y, z)
  return g
}

/** The grip every gun is held by: the hand closes round the origin. */
const grip = () => box(0.12, 0.32, 0.16, 0, -0.12, -0.05, 0.28)

/**
 * The shapes, one per gun type, each split by the material it takes and merged into
 * one geometry per material. Authored with the grip at the origin, the barrel down +Z
 * and up +Y, in units where the whole gun is about three quarters of a metre long.
 *
 * `tip` is how far down +Z the muzzle is, which is where the flash and the tracer
 * start. Thirty guns share six shapes; only the colours and the `size` change.
 */
const SHAPES = {
  pistol: {
    tip: 0.58,
    parts: () => ({
      body: merge([box(0.14, 0.17, 0.62, 0, 0.1, 0.14), grip()]),
      accent: merge([
        box(0.08, 0.08, 0.12, 0, 0.11, 0.5),
        box(0.04, 0.05, 0.2, 0, -0.04, 0.1),
        box(0.04, 0.05, 0.05, 0, 0.21, 0.4),
        box(0.135, 0.18, 0.11, 0, -0.14, -0.06, 0.28),
      ]),
      trim: box(0.15, 0.03, 0.5, 0, 0.13, 0.14),
    }),
  },
  blaster: {
    tip: 0.72,
    parts: () => ({
      body: merge([box(0.2, 0.22, 0.42, 0, 0.11, 0.1), grip()]),
      accent: merge([
        tube(0.05, 0.34, 0, 0.12, 0.46),
        tube(0.1, 0.04, 0, 0.12, 0.37, 12),
        tube(0.1, 0.04, 0, 0.12, 0.5, 12),
        box(0.04, 0.16, 0.14, 0, 0.28, -0.04),
      ]),
      trim: merge([tube(0.066, 0.07, 0, 0.12, 0.66, 12), box(0.08, 0.08, 0.26, 0, 0.26, 0.12)]),
    }),
  },
  rifle: {
    tip: 0.96,
    parts: () => ({
      body: merge([
        box(0.14, 0.18, 0.7, 0, 0.1, 0.15),
        box(0.12, 0.2, 0.34, 0, 0.04, -0.36),
        box(0.11, 0.26, 0.13, 0, -0.1, 0.02, 0.2),
      ]),
      accent: merge([
        tube(0.04, 0.44, 0, 0.12, 0.72),
        tube(0.05, 0.3, 0, 0.27, 0.18),
        box(0.06, 0.06, 0.04, 0, 0.21, 0.18),
        box(0.09, 0.24, 0.12, 0, -0.1, 0.3, -0.15),
      ]),
      trim: merge([box(0.15, 0.03, 0.6, 0, 0.15, 0.15), tube(0.052, 0.03, 0, 0.27, 0.34)]),
    }),
  },
  shotgun: {
    tip: 0.86,
    parts: () => ({
      body: merge([
        box(0.16, 0.2, 0.5, 0, 0.1, 0.06),
        box(0.13, 0.2, 0.34, 0, 0.03, -0.36),
        box(0.11, 0.26, 0.13, 0, -0.1, -0.02, 0.2),
      ]),
      accent: merge([
        tube(0.045, 0.6, -0.045, 0.14, 0.56),
        tube(0.045, 0.6, 0.045, 0.14, 0.56),
        box(0.15, 0.1, 0.22, 0, 0.05, 0.48),
      ]),
      trim: merge([box(0.17, 0.03, 0.44, 0, 0.16, 0.06), box(0.16, 0.03, 0.03, 0, 0.14, 0.85)]),
    }),
  },
  launcher: {
    tip: 0.72,
    parts: () => ({
      body: merge([tube(0.15, 0.96, 0, 0.2, 0.12, 14), grip(), box(0.1, 0.22, 0.12, 0, -0.04, 0.32)]),
      accent: merge([
        tube(0.18, 0.1, 0, 0.2, 0.58, 14),
        tube(0.18, 0.1, 0, 0.2, -0.32, 14),
        box(0.05, 0.1, 0.16, 0, 0.4, 0.1),
      ]),
      trim: merge([tube(0.11, 0.05, 0, 0.2, 0.66, 14), box(0.31, 0.03, 0.5, 0, 0.2, 0.12)]),
    }),
  },
  minigun: {
    tip: 0.86,
    parts: () => {
      const barrels = []
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        barrels.push(tube(0.03, 0.62, Math.cos(a) * 0.08, 0.13 + Math.sin(a) * 0.08, 0.54, 8))
      }
      return {
        body: merge([box(0.26, 0.26, 0.5, 0, 0.13, 0), box(0.06, 0.14, 0.22, 0, 0.33, 0), grip()]),
        accent: merge([...barrels, tube(0.12, 0.06, 0, 0.13, 0.3, 12), box(0.12, 0.16, 0.22, 0.2, 0.06, 0)]),
        trim: merge([tube(0.13, 0.05, 0, 0.13, 0.82, 12), box(0.27, 0.03, 0.4, 0, 0.27, 0)]),
      }
    },
  },
}

const shapeOf = (gun) => SHAPES[gun.type] ?? SHAPES.pistol
const partsOf = (gun) => geometry(`gun-${gun.type}`, shapeOf(gun).parts)

/** A small sight rail and side fasteners to give every weapon a finished silhouette. */
const DETAIL_LAYOUT = {
  pistol: { top: 0.205, z: 0.12, length: 0.28, halfWidth: 0.07, sideY: 0.1, sideZ: 0.22 },
  blaster: { top: 0.235, z: 0.1, length: 0.24, halfWidth: 0.1, sideY: 0.11, sideZ: 0.12 },
  rifle: { top: 0.2, z: 0.12, length: 0.42, halfWidth: 0.07, sideY: 0.1, sideZ: 0.05 },
  shotgun: { top: 0.205, z: 0.06, length: 0.32, halfWidth: 0.08, sideY: 0.1, sideZ: 0.04 },
  launcher: { top: 0.35, z: 0.12, length: 0.38, halfWidth: 0.14, sideY: 0.2, sideZ: 0.1 },
  minigun: { top: 0.265, z: 0.02, length: 0.3, halfWidth: 0.13, sideY: 0.13, sideZ: 0.02 },
}

function detailsOf(type) {
  return geometry(`gun-details-${type}`, () => {
    const layout = DETAIL_LAYOUT[type] ?? DETAIL_LAYOUT.pistol
    const sightZ = layout.length * 0.38
    const fastener = (x) => {
      const g = new CylinderGeometry(0.018, 0.018, 0.012, 8)
      g.rotateZ(Math.PI / 2)
      g.translate(x, layout.sideY, layout.sideZ)
      return g
    }
    return merge([
      box(0.07, 0.025, layout.length, 0, layout.top, layout.z),
      box(0.045, 0.055, 0.045, 0, layout.top + 0.035, layout.z - sightZ),
      box(0.045, 0.055, 0.045, 0, layout.top + 0.035, layout.z + sightZ),
      fastener(layout.halfWidth),
      fastener(-layout.halfWidth),
    ])
  })
}

/**
 * Blocky gun built from boxes and tubes. The grip is at the origin and the barrel
 * points down +Z, so holders only need to rotate it.
 *
 * @param {{ gun: import('./guns').GUNS[number], minGlow?: number,
 *           flashRef?: React.MutableRefObject<number>, local?: boolean }} props
 *   `minGlow` lights up even a plain gun's trim a little (the shop display uses it).
 *   `flashRef`, when given, is read every frame (not passed as a prop, so a shot
 *   doesn't re-render the gun 60 times a second): its `.current` (0-1) flares the
 *   trim and shows the muzzle flash, fading back as the shot settles.
 *   `local` marks the player's own held gun: its barrel tip is published as
 *   `aim.muzzle`, which is where the shot effects start.
 */
export function GunModel({ gun, minGlow = 0, flashRef, local = false }) {
  const baseGlow = Math.max(gun.glow ?? 0, minGlow)
  const parts = partsOf(gun)
  const tip = shapeOf(gun).tip
  const trimMat = useRef(null)
  const muzzle = useRef(null)

  useFrame(() => {
    if (!flashRef) return
    const boost = flashRef.current || 0
    if (trimMat.current) trimMat.current.emissiveIntensity = baseGlow + boost * FLASH_BOOST
    const m = muzzle.current
    if (m) {
      // Only the first, brightest part of the shot: a flash that lingers reads as a
      // torch, not a gunshot.
      const show = boost > 0.45
      m.visible = show
      if (show) {
        m.scale.setScalar(MUZZLE_SIZE * (0.6 + boost * 0.6))
        m.material.rotation = Math.random() * Math.PI * 2
      }
    }
  })

  return (
    <group scale={gun.size}>
      <mesh geometry={parts.body} castShadow>
        <meshStandardMaterial color={gun.body} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh geometry={parts.accent} castShadow>
        <meshStandardMaterial color={gun.accent} metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh geometry={detailsOf(gun.type)} castShadow>
        <meshStandardMaterial color="#252c38" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh geometry={parts.trim}>
        <meshStandardMaterial
          ref={trimMat}
          color={gun.trim}
          emissive={gun.trim}
          emissiveIntensity={baseGlow}
          metalness={0.55}
          roughness={0.26}
        />
      </mesh>
      {local && (
        <object3D
          position={[0, 0.12, tip]}
          ref={(el) => {
            if (el) aim.muzzle = el
            else aim.muzzle = null
          }}
        />
      )}
      {flashRef && (
        <sprite ref={muzzle} position={[0, 0.12, tip + 0.12]} visible={false}>
          <spriteMaterial
            map={radialGlowTexture()}
            color={gun.laser ? gun.trim : '#ffd27a'}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
    </group>
  )
}

export default GunModel
