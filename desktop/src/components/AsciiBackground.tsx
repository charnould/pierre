import { useEffect, useRef } from 'react'

const ASCII_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789│─┼┤├┬┴┐└┘┌╎╌·+/\\|~≡°·:;!?-_,.\'"` ^*#%@<>[]{}()'.split(
    ''
  )

// Palette "Arc-en-ciel électrique" — spectre complet, saturé, neon
// Rouge → orange → jaune → vert → cyan → bleu → violet → magenta + flashs blancs
const FRANKENSTEIN_HUES = [
  0,
  8,
  16, // rouge électrique
  28,
  38,
  48, // orange → jaune-orange
  58,
  68,
  80, // jaune → chartreuse
  105,
  130,
  155, // vert → teal
  175,
  190,
  205, // cyan → azur
  225,
  240,
  255, // bleu électrique
  270,
  285,
  300, // violet → purple
  315,
  335,
  350 // magenta → rose → rouge
]
const FONT_SIZE = 13
const CELL_W = 10
const CELL_H = 18

function pickHue() {
  return FRANKENSTEIN_HUES[Math.floor(Math.random() * FRANKENSTEIN_HUES.length)]
}

function buildGrid(cols: number, rows: number, label?: string) {
  const size = cols * rows
  const grid = Array.from(
    { length: size },
    () => ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
  )
  if (label) {
    for (let i = 0; i < label.length && i < grid.length; i++) {
      grid[i] = label[i]
    }
  }

  // Chaque cellule commence sur une teinte froide Frankenstein
  const hueGrid = Array.from({ length: size }, () => pickHue() + Math.random() * 6 - 3)
  // Légère gigue — reste dans la gamme froide
  const speedGrid = Array.from({ length: size }, () => (Math.random() - 0.5) * 3)
  // Luminosité neon : de 50% (couleurs saturées) à 80% (éclat électrique)
  const lightnessGrid = Array.from({ length: size }, () => 50 + Math.random() * 30)

  return { grid, hueGrid, speedGrid, lightnessGrid }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  grid: string[],
  hueGrid: number[],
  lightnessGrid: number[],
  animated: boolean,
  opacity: number
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.font = `${FONT_SIZE}px monospace`
  ctx.textBaseline = 'top'

  const alpha = opacity

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const hue = ((hueGrid[idx] % 360) + 360) % 360
      const l = lightnessGrid[idx].toFixed(1)
      ctx.fillStyle = `hsla(${hue.toFixed(1)}, 100%, ${l}%, ${alpha})`
      ctx.fillText(grid[idx], c * CELL_W, r * CELL_H)
    }
  }
}

interface Props {
  isAnimated?: boolean
  label?: string
  opacity?: number
  className?: string
}

export function AsciiBackground({ isAnimated = false, label, opacity = 0.3, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gridRef = useRef<string[]>([])
  const hueGridRef = useRef<number[]>([])
  const speedGridRef = useRef<number[]>([])
  const lightnessGridRef = useRef<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols = 0
    let rows = 0

    function resize() {
      if (!canvas) return
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      cols = Math.ceil(width / CELL_W)
      rows = Math.ceil(height / CELL_H)
      const built = buildGrid(cols, rows, label)
      gridRef.current = built.grid
      hueGridRef.current = built.hueGrid
      speedGridRef.current = built.speedGrid
      lightnessGridRef.current = built.lightnessGrid
      drawGrid(
        ctx!,
        cols,
        rows,
        gridRef.current,
        hueGridRef.current,
        lightnessGridRef.current,
        isAnimated,
        opacity
      )
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    if (isAnimated) {
      intervalRef.current = setInterval(() => {
        const g = gridRef.current
        const hg = hueGridRef.current
        const sg = speedGridRef.current
        const lg = lightnessGridRef.current
        for (let i = 0; i < g.length; i++) {
          if (Math.random() < 0.35) {
            g[i] = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
          }
          // Flash arc-en-ciel : éclair blanc-neon sur une teinte aléatoire
          if (Math.random() < 0.008) {
            hg[i] = Math.random() * 360 // teinte rainbow aléatoire
            lg[i] = 88 + Math.random() * 10 // quasi blanc — éclair
          } else if (Math.random() < 0.05) {
            // Dérive vers une nouvelle couleur rainbow
            hg[i] = pickHue() + Math.random() * 6 - 3
            lg[i] = 50 + Math.random() * 30
          } else {
            hg[i] += sg[i]
          }
        }
        drawGrid(ctx!, cols, rows, g, hg, lg, true, opacity)
      }, 50)
    }

    return () => {
      ro.disconnect()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isAnimated, label, opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className ?? ''}`}
      style={{ display: 'block' }}
    />
  )
}
