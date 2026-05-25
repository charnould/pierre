import { useEffect, useRef } from 'react'

import { neuronGridRgbaPrefix } from '../../lib/neuron-grid-color'

interface NeuronGridProps {
  active?: boolean
  className?: string
  /** Accent color as hex (#RRGGBB) or any valid CSS color. */
  color?: string
}

interface Neuron {
  x: number
  y: number
  activation: number
  neighbors: number[]
  jx: number
  jy: number
  js: number
}

interface Pulse {
  from: number
  to: number
  t: number
}

const SPACING = 30
const BASE_R = 1.8
const CONNECT_DIST = 50

export function NeuronGrid({ active = false, className = '', color = '#0000EE' }: NeuronGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const activeRef = useRef(active)
  const colorRef = useRef(neuronGridRgbaPrefix(color))
  const stateRef = useRef<{ neurons: Neuron[]; pulses: Pulse[] }>({ neurons: [], pulses: [] })

  // Keep refs in sync without restarting the loop
  useEffect(() => {
    activeRef.current = active
  }, [active])
  useEffect(() => {
    colorRef.current = neuronGridRgbaPrefix(color)
  }, [color])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const build = () => {
      if (canvas.width < 10 || canvas.height < 10) return
      const cols = Math.ceil(canvas.width / SPACING) + 2
      const rows = Math.ceil(canvas.height / SPACING) + 2
      const total = cols * rows
      const neurons: Neuron[] = Array.from({ length: total }, (_, i) => ({
        x: (i % cols) * SPACING,
        y: Math.floor(i / cols) * SPACING,
        activation: 0,
        neighbors: [],
        jx: Math.random() * Math.PI * 2,
        jy: Math.random() * Math.PI * 2,
        js: 0.4 + Math.random() * 0.6
      }))
      const cellSize = CONNECT_DIST
      const gridCols = Math.ceil(canvas.width / cellSize) + 1
      const grid = new Map<number, number[]>()
      const cellKey = (cx: number, cy: number) => cy * gridCols + cx
      for (let i = 0; i < neurons.length; i++) {
        const cx = Math.floor(neurons[i].x / cellSize)
        const cy = Math.floor(neurons[i].y / cellSize)
        const key = cellKey(cx, cy)
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key)!.push(i)
      }
      for (let i = 0; i < neurons.length; i++) {
        const cx = Math.floor(neurons[i].x / cellSize)
        const cy = Math.floor(neurons[i].y / cellSize)
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nb = grid.get(cellKey(cx + dx, cy + dy)) ?? []
            for (const j of nb) {
              if (j <= i) continue
              const ex = neurons[i].x - neurons[j].x
              const ey = neurons[i].y - neurons[j].y
              if (ex * ex + ey * ey < CONNECT_DIST * CONNECT_DIST) {
                neurons[i].neighbors.push(j)
                neurons[j].neighbors.push(i)
              }
            }
          }
        }
      }
      stateRef.current = { neurons, pulses: [] }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width || canvas.offsetWidth
      const h = rect.height || canvas.offsetHeight
      if (w > 0 && h > 0) {
        canvas.width = w
        canvas.height = h
        build()
      }
    }

    // Retry until the canvas has real dimensions (flex/CSS layout may not be settled at mount)
    let retryId: ReturnType<typeof setTimeout>
    const tryResize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        resize()
      } else {
        retryId = setTimeout(tryResize, 32)
      }
    }
    tryResize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      const t = now / 1000
      last = now

      const isActive = activeRef.current
      const { neurons, pulses } = stateRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Decay activations
      for (const n of neurons) {
        if (n.activation > 0) n.activation = Math.max(0, n.activation - dt * 3.5)
      }

      // Spontaneous firing
      if (isActive) {
        for (let f = 0; f < 4; f++) {
          const idx = Math.floor(Math.random() * neurons.length)
          const n = neurons[idx]
          if (n.activation < 0.2 && n.neighbors.length > 0) {
            n.activation = 1
            const to = n.neighbors[Math.floor(Math.random() * n.neighbors.length)]
            pulses.push({ from: idx, to, t: 0 })
          }
        }
      }

      // Advance pulses
      const done: number[] = []
      for (let i = 0; i < pulses.length; i++) {
        pulses[i].t += dt * 1.4
        if (pulses[i].t >= 1) {
          done.push(i)
          const target = neurons[pulses[i].to]
          if (target.activation < 0.4) {
            target.activation = 1
            if (isActive && target.neighbors.length > 0 && Math.random() < 0.45) {
              const candidates = target.neighbors.filter((n) => n !== pulses[i].from)
              if (candidates.length > 0) {
                pulses.push({
                  from: pulses[i].to,
                  to: candidates[Math.floor(Math.random() * candidates.length)],
                  t: 0
                })
              }
            }
          }
        }
      }
      for (let i = done.length - 1; i >= 0; i--) pulses.splice(done[i], 1)

      // Jitter helper
      const jx = (n: Neuron) => (isActive ? n.x + Math.sin(t * n.js * Math.PI * 2 + n.jx) * 3 : n.x)
      const jy = (n: Neuron) => (isActive ? n.y + Math.cos(t * n.js * Math.PI * 2 + n.jy) * 3 : n.y)

      // Draw axons
      ctx.lineWidth = 0.7
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i]
        for (const j of n.neighbors) {
          if (j <= i) continue
          const m = neurons[j]
          const glow = isActive ? Math.max(0.05, (n.activation + m.activation) * 0.35) : 0.06
          ctx.strokeStyle = colorRef.current + glow + ')'
          ctx.beginPath()
          ctx.moveTo(jx(n), jy(n))
          ctx.lineTo(jx(m), jy(m))
          ctx.stroke()
        }
      }

      // Draw pulses
      if (isActive) {
        for (const p of pulses) {
          const from = neurons[p.from]
          const to = neurons[p.to]
          const x = jx(from) + (jx(to) - jx(from)) * p.t
          const y = jy(from) + (jy(to) - jy(from)) * p.t
          const grd = ctx.createRadialGradient(x, y, 0, x, y, 5)
          grd.addColorStop(0, colorRef.current + '1)')
          grd.addColorStop(1, colorRef.current + '0)')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw neuron bodies
      for (const n of neurons) {
        const a = isActive ? Math.max(0.14, n.activation * 0.86 + 0.14) : 0.18
        const r = isActive ? BASE_R * (1 + n.activation * 1.4) : BASE_R
        ctx.fillStyle = colorRef.current + a + ')'
        ctx.beginPath()
        ctx.arc(jx(n), jy(n), r, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(retryId)
      ro.disconnect()
    }
  }, []) // single stable loop — active tracked via activeRef

  return (
    <canvas ref={canvasRef} className={`h-full w-full ${className}`} style={{ display: 'block' }} />
  )
}
