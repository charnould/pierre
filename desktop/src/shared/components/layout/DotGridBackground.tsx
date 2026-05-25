import { useEffect, useRef } from 'react'

import {
  heatToRgbString,
  resolveDotGridPalette,
  sweepHeat,
  type DotGridPalette
} from '@/shared/lib/dot-grid-palette'

interface DotGridBackgroundProps {
  active?: boolean
  className?: string
  /** Feather canvas alpha on all four edges so the page background shows through. */
  edgeFade?: boolean
}

const EDGE_FADE_MASK = [
  'linear-gradient(to bottom, transparent 0px, #000 52px)',
  'linear-gradient(to top, transparent 0px, #000 52px)',
  'linear-gradient(to right, transparent 0px, #000 52px)',
  'linear-gradient(to left, transparent 0px, #000 52px)'
].join(', ')

interface Dot {
  cx: number
  cy: number
  col: number
  row: number
  ox: number
  oy: number
  vx: number
  vy: number
  phase: number
  heat: number
}

interface Ripple {
  x: number
  y: number
  r: number
  strength: number
}

interface Pointer {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  lastX: number
  lastY: number
  lastTime: number
}

const DOT_R = 1.7
const GAP = 24
const PROXIMITY = 170
const SPEED_TRIGGER = 70
const SHOCK_RADIUS = 260
const SPRING = 195
const DAMPING = 15
const MAX_SPEED = 4500
const NEAREST_LINES = 10
const NEAREST_RADIUS = 240

export function DotGridBackground({
  active = false,
  className = '',
  edgeFade = true
}: DotGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const activeRef = useRef(active)
  const paletteRef = useRef<DotGridPalette>(resolveDotGridPalette())
  const dotsRef = useRef<Dot[]>([])
  const colsRef = useRef(0)
  const rowsRef = useRef(0)
  const ripplesRef = useRef<Ripple[]>([])
  const pointerRef = useRef<Pointer>({
    x: -9999,
    y: -9999,
    vx: 0,
    vy: 0,
    speed: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0
  })
  const rippleTimerRef = useRef(0)
  const beaconTimerRef = useRef(1.8)
  const startLoopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    activeRef.current = active
    if (active) startLoopRef.current?.()
    else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width || canvas.offsetWidth
      const h = rect.height || canvas.offsetHeight
      if (w < 10 || h < 10) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cell = DOT_R * 2 + GAP
      const cols = Math.floor((w + GAP) / cell)
      const rows = Math.floor((h + GAP) / cell)
      const gridW = cell * cols - GAP
      const gridH = cell * rows - GAP
      const startX = (w - gridW) / 2 + DOT_R
      const startY = (h - gridH) / 2 + DOT_R

      colsRef.current = cols
      rowsRef.current = rows
      const dots: Dot[] = []
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          dots.push({
            cx: startX + col * cell,
            cy: startY + row * cell,
            col,
            row,
            ox: 0,
            oy: 0,
            vx: 0,
            vy: 0,
            phase: Math.random() * Math.PI * 2,
            heat: 0
          })
        }
      }
      dotsRef.current = dots
      ripplesRef.current = []
      rippleTimerRef.current = 0
      beaconTimerRef.current = 1.8
    }

    const resize = () => build()

    let retryId: ReturnType<typeof setTimeout>
    const tryResize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) resize()
      else retryId = setTimeout(tryResize, 32)
    }
    tryResize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const updatePointer = (clientX: number, clientY: number) => {
      const now = performance.now()
      const pr = pointerRef.current
      const dt = pr.lastTime ? now - pr.lastTime : 16
      const dx = clientX - pr.lastX
      const dy = clientY - pr.lastY
      let vx = (dx / dt) * 1000
      let vy = (dy / dt) * 1000
      let speed = Math.hypot(vx, vy)
      if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed
        vx *= scale
        vy *= scale
        speed = MAX_SPEED
      }
      pr.lastTime = now
      pr.lastX = clientX
      pr.lastY = clientY
      pr.vx = vx
      pr.vy = vy
      pr.speed = speed
      const local = toLocal(clientX, clientY)
      pr.x = local.x
      pr.y = local.y
    }

    const pushDots = (px: number, py: number, strength: number, radius: number) => {
      const proxSq = radius * radius
      for (const dot of dotsRef.current) {
        const dx = dot.cx - px
        const dy = dot.cy - py
        const dsq = dx * dx + dy * dy
        if (dsq > proxSq || dsq < 1) continue
        const dist = Math.sqrt(dsq)
        const falloff = 1 - dist / radius
        dot.vx += (dx / dist) * strength * falloff
        dot.vy += (dy / dist) * strength * falloff
      }
    }

    const spawnRipple = (x: number, y: number, strength = 1) => {
      ripplesRef.current.push({ x, y, r: 0, strength })
    }

    const onMove = (e: MouseEvent) => {
      updatePointer(e.clientX, e.clientY)
      const pr = pointerRef.current
      const repulse = Math.min(pr.speed / 500, 1) * 10 + 4
      pushDots(pr.x, pr.y, repulse, PROXIMITY * 0.85)
      if (pr.speed > SPEED_TRIGGER) {
        const impulse = Math.min(pr.speed / 600, 1) * 22
        pushDots(pr.x, pr.y, impulse, PROXIMITY)
      }
    }

    const onClick = (e: MouseEvent) => {
      const local = toLocal(e.clientX, e.clientY)
      pushDots(local.x, local.y, 18, SHOCK_RADIUS)
      spawnRipple(local.x, local.y, 1.4)
      spawnRipple(local.x, local.y, 0.9)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('click', onClick)

    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      const t = now / 1000
      last = now

      const isActive = activeRef.current
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      const palette = resolveDotGridPalette()
      paletteRef.current = palette
      const inkRgb = palette.ink.join(',')
      const { x: px, y: py } = pointerRef.current
      const proxSq = PROXIMITY * PROXIMITY
      const cx = w / 2
      const cy = h / 2

      ctx.clearRect(0, 0, w, h)

      // Soft vignette — foreground token at the edges
      const vignette = ctx.createRadialGradient(
        cx,
        cy,
        Math.min(w, h) * 0.2,
        cx,
        cy,
        Math.max(w, h) * 0.72
      )
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, `rgba(${inkRgb},0.07)`)
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, w, h)

      if (isActive) {
        rippleTimerRef.current += dt
        if (rippleTimerRef.current > 1.6 && dotsRef.current.length > 0) {
          rippleTimerRef.current = 0
          const pick = dotsRef.current[Math.floor(Math.random() * dotsRef.current.length)]
          spawnRipple(pick.cx, pick.cy, 1)
        }

        beaconTimerRef.current += dt
        if (beaconTimerRef.current > 5.5) {
          beaconTimerRef.current = 0
          spawnRipple(cx, cy, 1.25)
        }
      }

      const ripples = ripplesRef.current
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].r += dt * (145 + ripples[i].strength * 40)
        if (ripples[i].r > Math.max(w, h) * 1.35) ripples.splice(i, 1)
      }

      const sweepA = ((t * 0.22) % 1) * (w + h)
      const sweepB = (1 - ((t * 0.17) % 1)) * (w + h)
      const sweepTrailA = ((((t * 0.22 - 0.06) % 1) + 1) % 1) * (w + h)
      const sweepTrailB = ((((1 - ((t * 0.17 - 0.05) % 1)) % 1) + 1) % 1) * (w + h)

      const dots = dotsRef.current
      const cols = colsRef.current

      for (const dot of dots) {
        const ax = -SPRING * dot.ox - DAMPING * dot.vx
        const ay = -SPRING * dot.oy - DAMPING * dot.vy
        dot.vx += ax * dt
        dot.vy += ay * dt
        dot.ox += dot.vx * dt
        dot.oy += dot.vy * dt

        const wave = Math.sin(t * 1.15 + dot.cx * 0.016 + dot.cy * 0.013 + dot.phase) * 0.5 + 0.5

        for (const ripple of ripples) {
          const rd = Math.hypot(dot.cx - ripple.x, dot.cy - ripple.y)
          const band = 44
          const ring = Math.abs(rd - ripple.r)
          if (ring < band) {
            const push = (1 - ring / band) * 0.55 * ripple.strength
            const nx = rd > 0.001 ? (dot.cx - ripple.x) / rd : 0
            const ny = rd > 0.001 ? (dot.cy - ripple.y) / rd : 0
            dot.vx += nx * push
            dot.vy += ny * push
          }
        }

        const dx = dot.cx - px
        const dy = dot.cy - py
        const dsq = dx * dx + dy * dy
        let heat = isActive ? 0.08 + wave * 0.12 : 0.06 + wave * 0.07

        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq)
          heat += (1 - dist / PROXIMITY) ** 1.6 * 0.72
        }

        const diag = dot.cx + dot.cy
        heat += sweepHeat(diag, sweepA, 180) * (isActive ? 0.55 : 0.32)
        heat += sweepHeat(diag, sweepTrailA, 120) * 0.18
        heat += sweepHeat(w + h - diag, sweepB, 150) * (isActive ? 0.42 : 0.24)
        heat += sweepHeat(w + h - diag, sweepTrailB, 100) * 0.14

        for (const ripple of ripples) {
          const rd = Math.hypot(dot.cx - ripple.x, dot.cy - ripple.y)
          const band = 48
          const ring = Math.abs(rd - ripple.r)
          if (ring < band) {
            heat += (1 - ring / band) * 0.48 * ripple.strength
          }
        }

        dot.heat = Math.min(heat, 1)
      }

      const rows = rowsRef.current

      // Expanding ripple rings
      for (const ripple of ripples) {
        const fade = Math.max(0, 1 - ripple.r / (Math.max(w, h) * 1.1))
        const alpha = 0.22 * fade * ripple.strength
        ctx.strokeStyle = `rgba(${inkRgb},${alpha})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = `rgba(${inkRgb},${alpha * 0.45})`
        ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.r * 0.92, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Hot neighbor mesh — holographic grid activation
      ctx.lineWidth = 0.55
      for (const dot of dots) {
        if (dot.heat < 0.38) continue
        const x = dot.cx + dot.ox
        const y = dot.cy + dot.oy
        if (dot.col + 1 < cols) {
          const right = dots[dot.row * cols + dot.col + 1]
          const edgeHeat = (dot.heat + right.heat) * 0.5
          if (edgeHeat > 0.35) {
            ctx.strokeStyle = `rgba(${heatToRgbString(palette, edgeHeat)},${0.08 + edgeHeat * 0.22})`
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(right.cx + right.ox, right.cy + right.oy)
            ctx.stroke()
          }
        }
        if (dot.row + 1 < rows) {
          const down = dots[(dot.row + 1) * cols + dot.col]
          const edgeHeat = (dot.heat + down.heat) * 0.5
          if (edgeHeat > 0.35) {
            ctx.strokeStyle = `rgba(${heatToRgbString(palette, edgeHeat)},${0.08 + edgeHeat * 0.22})`
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(down.cx + down.ox, down.cy + down.oy)
            ctx.stroke()
          }
        }
      }

      // Cursor targeting constellation
      const pointerNear = px > -1000
      if (pointerNear) {
        const nearest: { dot: Dot; dist: number }[] = []
        for (const dot of dots) {
          const dist = Math.hypot(dot.cx - px, dot.cy - py)
          if (dist > NEAREST_RADIUS) continue
          if (nearest.length < NEAREST_LINES) {
            nearest.push({ dot, dist })
            nearest.sort((a, b) => a.dist - b.dist)
          } else if (dist < nearest[nearest.length - 1].dist) {
            nearest[nearest.length - 1] = { dot, dist }
            nearest.sort((a, b) => a.dist - b.dist)
          }
        }

        for (const { dot, dist } of nearest) {
          const x = dot.cx + dot.ox + Math.sin(t * 0.8 + dot.phase) * (isActive ? 3.4 : 1.6)
          const y = dot.cy + dot.oy + Math.cos(t * 0.65 + dot.phase) * (isActive ? 3.4 : 1.6)
          const strength = (1 - dist / NEAREST_RADIUS) * (0.35 + dot.heat * 0.45)
          const grad = ctx.createLinearGradient(px, py, x, y)
          grad.addColorStop(0, `rgba(${inkRgb},${0.28 * strength})`)
          grad.addColorStop(0.55, `rgba(${inkRgb},${0.14 * strength})`)
          grad.addColorStop(
            1,
            `rgba(${heatToRgbString(palette, dot.heat)},${0.04 + dot.heat * 0.2})`
          )
          ctx.strokeStyle = grad
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(x, y)
          ctx.stroke()
        }

        // Cursor energy field
        const field = ctx.createRadialGradient(px, py, 0, px, py, PROXIMITY * 1.1)
        field.addColorStop(0, `rgba(${inkRgb},0.09)`)
        field.addColorStop(0.45, `rgba(${inkRgb},0.04)`)
        field.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = field
        ctx.beginPath()
        ctx.arc(px, py, PROXIMITY * 1.1, 0, Math.PI * 2)
        ctx.fill()

        const ringPulse = 0.5 + Math.sin(t * 4.2) * 0.5
        ctx.strokeStyle = `rgba(${inkRgb},${0.12 + ringPulse * 0.18})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(px, py, 18 + ringPulse * 10, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = `rgba(${inkRgb},${0.06 + ringPulse * 0.1})`
        ctx.beginPath()
        ctx.arc(px, py, 32 + ringPulse * 14, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Dots + bloom
      for (const dot of dots) {
        const ambientOx = Math.sin(t * 0.8 + dot.cy * 0.02 + dot.phase) * (isActive ? 3.4 : 1.6)
        const ambientOy = Math.cos(t * 0.65 + dot.cx * 0.017 + dot.phase) * (isActive ? 3.4 : 1.6)
        const x = dot.cx + dot.ox + ambientOx
        const y = dot.cy + dot.oy + ambientOy
        const rgb = heatToRgbString(palette, dot.heat)
        const alpha = 0.14 + dot.heat * 0.74
        const r = DOT_R * (1 + dot.heat * 1.15)

        if (dot.heat > 0.28) {
          const glowR = r * (3.5 + dot.heat * 4)
          const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR)
          glow.addColorStop(0, `rgba(${rgb},${alpha * 0.45})`)
          glow.addColorStop(0.35, `rgba(${rgb},${alpha * 0.12})`)
          glow.addColorStop(1, `rgba(${rgb},0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(x, y, glowR, 0, Math.PI * 2)
          ctx.fill()
        }

        if (dot.heat > 0.72) {
          ctx.fillStyle = `rgba(${inkRgb},${(dot.heat - 0.72) * 0.85})`
          ctx.beginPath()
          ctx.arc(x, y, r * 0.55, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.fillStyle = `rgba(${rgb},${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (activeRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = 0
      }
    }

    const startLoop = () => {
      if (rafRef.current) return
      last = performance.now()
      rafRef.current = requestAnimationFrame(tick)
    }

    startLoopRef.current = startLoop
    startLoop()

    return () => {
      startLoopRef.current = null
      cancelAnimationFrame(rafRef.current)
      clearTimeout(retryId)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      style={{
        display: 'block',
        pointerEvents: 'none',
        ...(edgeFade
          ? {
              WebkitMaskImage: EDGE_FADE_MASK,
              maskImage: EDGE_FADE_MASK,
              WebkitMaskComposite: 'source-in',
              maskComposite: 'intersect'
            }
          : {})
      }}
    />
  )
}
