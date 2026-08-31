import { useId } from 'react'

import { cn } from '@/shared/lib/utils'

import {
  DEFAULT_MASCOT_BADGE_COLOR,
  DEFAULT_MASCOT_COLOR,
  DEFAULT_MASCOT_SHAPE,
  MASCOT_REST_GAZE,
  mascotBodyPaint,
  type MascotBodyPaint,
  type MascotColor,
  type MascotShape
} from './look'
import {
  NOTIF_ANGLE,
  NOTIF_DIST,
  NOTIF_MARGIN,
  NOTIF_R,
  orbitArcs,
  orbitGaze,
  orbitIdleBlend,
  type ArcRender
} from './orbit'
import {
  blinkScale,
  BODY_R,
  capsulePath,
  clamp,
  eyePoses,
  mascotBodyPath,
  mascotRadii,
  mascotViewBox,
  MASCOT_VIEWBOX_MIN,
  MASCOT_VIEWBOX_SIZE,
  radiusAtAngle,
  r2,
  type MascotFit
} from './profiles'

const GAZE_TRAVEL_X = 14
const GAZE_TRAVEL_Y = 12
const FACE_TILT_DEG = 10
const EYE_W = 10.2
const EYE_H = EYE_W * 1.7
const EYE_GAP = EYE_W * 1.15
const EYE_CX = EYE_W / 2 + EYE_GAP / 2

type Props = {
  shape?: MascotShape
  color?: MascotColor
  badgeColor?: MascotColor
  /** -1..1 around rest gaze. */
  gazeX?: number
  gazeY?: number
  /** 1 = ouvert, ~0.18 = cligné. */
  blink?: number
  squash?: number
  showPastille?: boolean
  pastilleScale?: number
  /** Temps local de l’orbit, en secondes. `null` = pas d’anneaux. */
  orbitT?: number | null
  /** false = silhouette seule (tuiles de forme). */
  face?: boolean
  /** `body` = viewBox du disque (avatar). Défaut = scène bureau. */
  fit?: MascotFit
  className?: string
}

export function MascotSvg({
  shape = DEFAULT_MASCOT_SHAPE,
  color = DEFAULT_MASCOT_COLOR,
  badgeColor = DEFAULT_MASCOT_BADGE_COLOR,
  gazeX = MASCOT_REST_GAZE.x,
  gazeY = MASCOT_REST_GAZE.y,
  blink = 1,
  squash = 1,
  showPastille = false,
  pastilleScale = 1,
  orbitT = null,
  face = true,
  fit = 'scene',
  className
}: Props) {
  const reactId = useId().replace(/:/g, '')
  const maskId = `mascot-body-${reactId}`
  const bodyPath = mascotBodyPath(shape)
  const radii = mascotRadii(shape)
  const eyelid = Math.min(1, Math.max(0.18, blink))
  const arcs = orbitT === null ? [] : orbitArcs(orbitT)
  const pastille = showPastille ? pastilleLayout(radii, pastilleScale) : null
  const paint = mascotBodyPaint(color)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={mascotViewBox(fit)}
      className={cn(fit === 'body' ? 'block overflow-hidden' : 'block overflow-visible', className)}
      style={{
        transform: `scale(${squash}, ${1 + (squash - 1) * 1.2})`,
        transformOrigin: 'center'
      }}
      aria-hidden
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x={MASCOT_VIEWBOX_MIN}
          y={MASCOT_VIEWBOX_MIN}
          width={MASCOT_VIEWBOX_SIZE}
          height={MASCOT_VIEWBOX_SIZE}
        >
          <path d={bodyPath} fill="#fff" />
          {pastille ? (
            <circle cx={pastille.x} cy={pastille.y} r={pastille.notch} fill="#000" />
          ) : null}
        </mask>
        <BodyPaintDefs uid={reactId} paint={paint} />
        {arcs.map((arc) => (
          <linearGradient
            key={arc.id}
            id={`${reactId}-${arc.id}`}
            x1={arc.grad.x1}
            y1={arc.grad.y1}
            x2={arc.grad.x2}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((stop, i) => (
              <stop
                key={i}
                offset={`${(i / (arc.grad.stops.length - 1)) * 100}%`}
                stopColor={stop}
              />
            ))}
          </linearGradient>
        ))}
      </defs>
      <OrbitArcs arcs={arcs} uid={reactId} side="back" />
      <g mask={`url(#${maskId})`}>
        <BodyMatter uid={reactId} />
        {face ? (
          orbitT !== null ? (
            <OrbitHandoff t={orbitT} radii={radii} blink={eyelid} gazeX={gazeX} gazeY={gazeY} />
          ) : (
            <IdleFace gazeX={gazeX} gazeY={gazeY} eyelid={eyelid} />
          )
        ) : null}
      </g>
      <OrbitArcs arcs={arcs} uid={reactId} side="front" />
      {pastille ? (
        <circle cx={pastille.x} cy={pastille.y} r={pastille.r} fill={badgeColor} />
      ) : null}
    </svg>
  )
}

function BodyPaintDefs({ uid, paint }: { uid: string; paint: MascotBodyPaint }) {
  const blurPad = 28
  return (
    <>
      <filter
        id={`${uid}-diffuse`}
        filterUnits="userSpaceOnUse"
        x={MASCOT_VIEWBOX_MIN - blurPad}
        y={MASCOT_VIEWBOX_MIN - blurPad}
        width={MASCOT_VIEWBOX_SIZE + blurPad * 2}
        height={MASCOT_VIEWBOX_SIZE + blurPad * 2}
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation="11" />
      </filter>
      <radialGradient
        id={`${uid}-vol`}
        gradientUnits="userSpaceOnUse"
        cx={paint.vol.cx}
        cy={paint.vol.cy}
        r={paint.vol.r}
      >
        <stop offset="0%" stopColor={paint.vol.lit} />
        <stop offset="18%" stopColor={paint.vol.wash} />
        <stop offset="46%" stopColor={paint.vol.mid} />
        <stop offset="74%" stopColor={paint.vol.blush} />
        <stop offset="100%" stopColor={paint.vol.dim} />
      </radialGradient>
      <PoolGradient uid={uid} name="cool" pool={paint.cool} />
      <PoolGradient uid={uid} name="warm" pool={paint.warm} />
      <PoolGradient uid={uid} name="deep" pool={paint.deep} />
      <PoolGradient uid={uid} name="caustic" pool={paint.caustic} />
      <PoolGradient uid={uid} name="sheen" pool={paint.sheen} />
      <PoolGradient uid={uid} name="limb" pool={paint.limb} />
      <radialGradient id={`${uid}-rim`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={BODY_R + 2}>
        <stop offset="0%" stopColor={paint.rim.color} stopOpacity={0} />
        <stop offset="55%" stopColor={paint.rim.color} stopOpacity={0} />
        <stop offset="82%" stopColor={paint.rim.color} stopOpacity={paint.rim.opacity * 0.4} />
        <stop offset="100%" stopColor={paint.rim.color} stopOpacity={paint.rim.opacity} />
      </radialGradient>
    </>
  )
}

function PoolGradient({
  uid,
  name,
  pool
}: {
  uid: string
  name: string
  pool: MascotBodyPaint['cool']
}) {
  return (
    <radialGradient
      id={`${uid}-${name}`}
      gradientUnits="userSpaceOnUse"
      cx={pool.cx}
      cy={pool.cy}
      r={pool.r}
    >
      <stop offset="0%" stopColor={pool.color} stopOpacity={pool.opacity} />
      <stop offset="100%" stopColor={pool.color} stopOpacity={0} />
    </radialGradient>
  )
}

function BodyMatter({ uid }: { uid: string }) {
  const layer = (name: string) => (
    <rect
      x={MASCOT_VIEWBOX_MIN}
      y={MASCOT_VIEWBOX_MIN}
      width={MASCOT_VIEWBOX_SIZE}
      height={MASCOT_VIEWBOX_SIZE}
      fill={`url(#${uid}-${name})`}
    />
  )
  return (
    <>
      {layer('vol')}
      <g filter={`url(#${uid}-diffuse)`}>
        {layer('cool')}
        {layer('warm')}
        {layer('deep')}
        {layer('caustic')}
        {layer('sheen')}
        {layer('limb')}
      </g>
      {layer('rim')}
    </>
  )
}

function pastilleLayout(radii: number[], scale: number) {
  const a = (NOTIF_ANGLE * Math.PI) / 180
  const fit = radiusAtAngle(radii, a)
  const x = Math.cos(a) * NOTIF_DIST * fit * BODY_R
  const y = Math.sin(a) * NOTIF_DIST * fit * BODY_R
  const r = NOTIF_R * BODY_R * scale
  return { x, y, r, notch: r + NOTIF_MARGIN * BODY_R }
}

function IdleFace({ gazeX, gazeY, eyelid }: { gazeX: number; gazeY: number; eyelid: number }) {
  const faceX = gazeX * GAZE_TRAVEL_X
  const faceY = gazeY * GAZE_TRAVEL_Y
  return (
    <g transform={`translate(${faceX} ${faceY}) rotate(${FACE_TILT_DEG})`}>
      <Eye cx={-EYE_CX} eyelid={eyelid} />
      <Eye cx={EYE_CX} eyelid={eyelid} />
    </g>
  )
}

function OrbitHandoff({
  t,
  radii,
  blink,
  gazeX,
  gazeY
}: {
  t: number
  radii: number[]
  blink: number
  gazeX: number
  gazeY: number
}) {
  const blend = orbitIdleBlend(t)
  return (
    <>
      {blend < 1 ? (
        <g opacity={1 - blend}>
          <OrbitFace t={t} radii={radii} blink={blink} />
        </g>
      ) : null}
      {blend > 0 ? (
        <g opacity={blend}>
          <IdleFace gazeX={gazeX} gazeY={gazeY} eyelid={blink} />
        </g>
      ) : null}
    </>
  )
}

function OrbitFace({ t, radii, blink }: { t: number; radii: number[]; blink: number }) {
  const gaze = orbitGaze(t)
  const poses = eyePoses(gaze, BODY_R)
  const lid = blinkScale(blink)
  return (
    <>
      {poses.map((e, i) => {
        if (e.depth <= 0.02) return null
        const fit = radiusAtAngle(radii, Math.atan2(e.y, e.x))
        const k = lid
        return (
          <path
            key={i}
            d={capsulePath(gaze.eyeW * BODY_R, gaze.eyeH * BODY_R)}
            fill="#fff"
            transform={`matrix(${r2(e.a)},${r2(e.b * k)},${r2(e.c)},${r2(e.d * k)},${r2(e.x * fit)},${r2(e.y * fit)})`}
            opacity={clamp(e.depth / 0.12)}
          />
        )
      })}
    </>
  )
}

function OrbitArcs({
  arcs,
  uid,
  side
}: {
  arcs: ArcRender[]
  uid: string
  side: 'front' | 'back'
}) {
  return (
    <>
      {arcs.map((arc) => {
        const d = side === 'back' ? arc.back : arc.front
        if (!d) return null
        return (
          <path
            key={`${arc.id}-${side}`}
            d={d}
            fill="none"
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            strokeLinecap="round"
            opacity={arc.opacity}
          />
        )
      })}
    </>
  )
}

function Eye({ cx, eyelid }: { cx: number; eyelid: number }) {
  return (
    <g transform={`translate(${cx} 0)`}>
      <g transform={`scale(1 ${eyelid})`}>
        <rect
          x={-EYE_W / 2}
          y={-EYE_H / 2}
          width={EYE_W}
          height={EYE_H}
          rx={EYE_W / 2}
          fill="#fff"
        />
      </g>
    </g>
  )
}
