import { useEffect, useRef, useState } from 'react'

import { MASCOT_REST_GAZE } from './look'
import {
  ORBIT_DURATION,
  ORBIT_PASTILLE_AT,
  PASTILLE_POP_S,
  pastillePopScale,
  shouldPlayOrbit,
  shouldPlayPastillePop
} from './orbit'

type MascotClipId = 'blink' | 'blink-double' | 'glance' | 'mouth'

export type MascotWait = {
  min: number
  max: number
  bias: 'flat' | 'square'
}

export type MascotMode = {
  wait: MascotWait
  clips: readonly { id: MascotClipId; weight: number }[]
}

export const IDLE_MODE: MascotMode = {
  wait: { min: 2200, max: 8000, bias: 'square' },
  clips: [
    { id: 'blink', weight: 58 },
    { id: 'mouth', weight: 14 },
    { id: 'blink-double', weight: 13 },
    { id: 'glance', weight: 15 }
  ]
}

export const REST_GAZE = MASCOT_REST_GAZE

const REST = { gazeX: REST_GAZE.x, gazeY: REST_GAZE.y, blink: 1, squash: 1, mouth: 0.1 } as const
const BLINK_CLOSED = 0.18
const BLINK_CLOSE_MS = 90
const BLINK_OPEN_MS = 170
const BLINK_GAP_MS = 120
const GLANCE_OUT_MS = 560
const GLANCE_BACK_MS = 680

export function waitMs(wait: MascotWait, t: number): number {
  const unit = Math.min(1, Math.max(0, t))
  const biased = wait.bias === 'square' ? unit * unit : unit
  return wait.min + (wait.max - wait.min) * biased
}

export function pickWeighted<T>(items: readonly { id: T; weight: number }[], t: number): T {
  const unit = Math.min(1, Math.max(0, t))
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let cursor = unit * total
  for (const item of items) {
    cursor -= item.weight
    if (cursor <= 0) return item.id
  }
  return items[items.length - 1]!.id
}

export { shouldPlayOrbit, shouldPlayPastillePop }

export function easeInQuad(t: number): number {
  const unit = Math.min(1, Math.max(0, t))
  return unit * unit
}

export function easeOutCubic(t: number): number {
  const unit = Math.min(1, Math.max(0, t))
  return 1 - (1 - unit) ** 3
}

export function easeInOutCubic(t: number): number {
  const unit = Math.min(1, Math.max(0, t))
  return unit < 0.5 ? 4 * unit * unit * unit : 1 - (-2 * unit + 2) ** 3 / 2
}

const BREATHE_PERIOD_MS = 2400
const BREATHE_AMPLITUDE = 0.045

/** 1 au repos, jusqu’à 1+amplitude en haut d’inspire. */
function breatheWave(nowMs: number, periodMs = BREATHE_PERIOD_MS): number {
  const period = periodMs <= 0 ? BREATHE_PERIOD_MS : periodMs
  return (1 - Math.cos((nowMs / period) * Math.PI * 2)) / 2
}

export function breatheScale(
  nowMs: number,
  periodMs = BREATHE_PERIOD_MS,
  amplitude = BREATHE_AMPLITUDE
): number {
  return 1 + amplitude * breatheWave(nowMs, periodMs)
}

/** 0 = sourire idle, 1 = bouche ouverte unread. */
export function mouthOpenAt(unread: boolean, wave: number, burst = 0): number {
  const base = unread ? 0.68 : 0.1
  const amp = unread ? 0.26 : 0.16
  return Math.min(1, Math.max(0, base + wave * amp + burst))
}

export type MascotLife = {
  gazeX: number
  gazeY: number
  blink: number
  mouth: number
  squash: number
  orbitT: number | null
  pastilleScale: number
  showPastille: boolean
}

type Sleeper = {
  sleep: (ms: number) => Promise<void>
  frame: () => Promise<void>
  cancel: () => void
}

function createSleeper(): Sleeper {
  const timeouts: number[] = []
  const frames: number[] = []
  return {
    sleep(ms) {
      return new Promise((resolve) => {
        timeouts.push(window.setTimeout(resolve, ms))
      })
    },
    frame() {
      return new Promise((resolve) => {
        const id = window.requestAnimationFrame(() => {
          const index = frames.indexOf(id)
          if (index >= 0) frames.splice(index, 1)
          resolve()
        })
        frames.push(id)
      })
    },
    cancel() {
      while (timeouts.length > 0) window.clearTimeout(timeouts.pop())
      while (frames.length > 0) window.cancelAnimationFrame(frames.pop()!)
    }
  }
}

/**
 * Vie idle : clips courts, attente irrégulière.
 * Toute hausse de non-lus relance l’orbit, puis fondu vers l’idle.
 */
export function useMascotLife(
  unreadCount: number,
  reduceMotion: boolean | null,
  random: () => number = Math.random
): MascotLife {
  const [gazeX, setGazeX] = useState<number>(REST_GAZE.x)
  const [gazeY, setGazeY] = useState<number>(REST_GAZE.y)
  const [blink, setBlink] = useState(1)
  const [breathe, setBreathe] = useState(1)
  const [mouth, setMouth] = useState<number>(REST.mouth)
  const [orbitT, setOrbitT] = useState<number | null>(null)
  const [pastilleScale, setPastilleScale] = useState(1)
  const mouthBurst = useRef(0)
  const prevUnread = useRef(unreadCount)
  const orbiting = useRef(false)
  const popping = useRef(false)
  const busy = useRef(false)
  const animFrame = useRef(0)

  const stopAnim = () => {
    if (animFrame.current) window.cancelAnimationFrame(animFrame.current)
    animFrame.current = 0
  }

  useEffect(() => {
    if (reduceMotion) return
    let frame = 0
    const tick = (now: number) => {
      const wave = breatheWave(now)
      setBreathe(breatheScale(now))
      setMouth(mouthOpenAt(unreadCount > 0, wave, mouthBurst.current))
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [reduceMotion, unreadCount])

  useEffect(() => {
    if (reduceMotion) {
      stopAnim()
      orbiting.current = false
      popping.current = false
      busy.current = false
      prevUnread.current = unreadCount
      return
    }

    const prev = prevUnread.current
    prevUnread.current = unreadCount

    if (shouldPlayOrbit(prev, unreadCount)) {
      stopAnim()
      busy.current = true
      orbiting.current = true
      popping.current = false
      setGazeX(REST_GAZE.x)
      setGazeY(REST_GAZE.y)
      setBlink(1)
      const started = performance.now()
      const tick = (now: number) => {
        const t = (now - started) / 1000
        if (t >= ORBIT_DURATION) {
          animFrame.current = 0
          setOrbitT(null)
          setPastilleScale(1)
          setGazeX(REST_GAZE.x)
          setGazeY(REST_GAZE.y)
          setBlink(1)
          orbiting.current = false
          busy.current = false
          return
        }
        setOrbitT(t)
        if (t >= ORBIT_PASTILLE_AT) {
          setPastilleScale(pastillePopScale(t - ORBIT_PASTILLE_AT))
        }
        animFrame.current = window.requestAnimationFrame(tick)
      }
      animFrame.current = window.requestAnimationFrame(tick)
      return
    }

    if (shouldPlayPastillePop(prev, unreadCount)) {
      if (busy.current) return
      busy.current = true
      popping.current = true
      const started = performance.now()
      const tick = (now: number) => {
        const t = (now - started) / 1000
        if (t >= PASTILLE_POP_S) {
          animFrame.current = 0
          setPastilleScale(1)
          popping.current = false
          busy.current = false
          return
        }
        setPastilleScale(pastillePopScale(t))
        animFrame.current = window.requestAnimationFrame(tick)
      }
      animFrame.current = window.requestAnimationFrame(tick)
    }
  }, [reduceMotion, unreadCount])

  useEffect(() => () => stopAnim(), [])

  useEffect(() => {
    if (reduceMotion) {
      mouthBurst.current = 0
      return
    }

    const sleeper = createSleeper()
    let cancelled = false
    mouthBurst.current = 0

    const tween = async (
      from: number,
      to: number,
      ms: number,
      apply: (value: number) => void,
      ease: (t: number) => number
    ) => {
      const started = performance.now()
      apply(from)
      if (ms <= 0) {
        apply(to)
        return
      }
      while (!cancelled) {
        await sleeper.frame()
        if (cancelled || orbiting.current) return
        const t = Math.min(1, (performance.now() - started) / ms)
        apply(from + (to - from) * ease(t))
        if (t >= 1) return
      }
    }

    const tweenGaze = async (
      toX: number,
      toY: number,
      ms: number,
      fromX: number,
      fromY: number
    ) => {
      const started = performance.now()
      while (!cancelled) {
        await sleeper.frame()
        if (cancelled || orbiting.current) return
        const t = Math.min(1, (performance.now() - started) / ms)
        const eased = easeInOutCubic(t)
        setGazeX(fromX + (toX - fromX) * eased)
        setGazeY(fromY + (toY - fromY) * eased)
        if (t >= 1) return
      }
    }

    const tweenBurst = async (from: number, to: number, ms: number) => {
      await tween(
        from,
        to,
        ms,
        (value) => {
          mouthBurst.current = value
        },
        easeInOutCubic
      )
    }

    const blinkOnce = async () => {
      await tween(1, BLINK_CLOSED, BLINK_CLOSE_MS, setBlink, easeInQuad)
      if (cancelled) return
      await tween(BLINK_CLOSED, 1, BLINK_OPEN_MS, setBlink, easeOutCubic)
    }

    const playClip = async (clip: MascotClipId) => {
      if (orbiting.current) return
      if (clip === 'blink') {
        await blinkOnce()
        return
      }
      if (clip === 'blink-double') {
        await blinkOnce()
        if (cancelled) return
        await sleeper.sleep(BLINK_GAP_MS)
        if (cancelled) return
        await blinkOnce()
        return
      }
      if (clip === 'mouth') {
        await tweenBurst(0, 0.28, 180)
        if (cancelled) return
        await sleeper.sleep(120 + random() * 80)
        if (cancelled) return
        await tweenBurst(0.28, 0, 240)
        mouthBurst.current = 0
        return
      }
      const dir = random() < 0.5 ? -1 : 1
      const toX = REST_GAZE.x + dir * 0.32
      const toY = REST_GAZE.y + random() * 0.18 - 0.08
      await tweenGaze(toX, toY, GLANCE_OUT_MS, REST_GAZE.x, REST_GAZE.y)
      if (cancelled) return
      await sleeper.sleep(280 + random() * 220)
      if (cancelled) return
      await tweenGaze(REST_GAZE.x, REST_GAZE.y, GLANCE_BACK_MS, toX, toY)
    }

    const run = async () => {
      while (!cancelled) {
        await sleeper.sleep(waitMs(IDLE_MODE.wait, random()))
        if (cancelled) return
        if (orbiting.current) continue
        await playClip(pickWeighted(IDLE_MODE.clips, random()))
      }
    }

    void run()
    return () => {
      cancelled = true
      sleeper.cancel()
      mouthBurst.current = 0
    }
  }, [random, reduceMotion])

  const showPastille = unreadCount > 0 && (orbitT === null || orbitT >= ORBIT_PASTILLE_AT)

  return {
    gazeX: reduceMotion ? REST.gazeX : gazeX,
    gazeY: reduceMotion ? REST.gazeY : gazeY,
    blink: reduceMotion || orbitT !== null ? REST.blink : blink,
    mouth: reduceMotion ? (unreadCount > 0 ? 0.68 : REST.mouth) : mouth,
    squash: reduceMotion ? REST.squash : breathe,
    orbitT: reduceMotion ? null : orbitT,
    pastilleScale: reduceMotion ? 1 : pastilleScale,
    showPastille
  }
}
