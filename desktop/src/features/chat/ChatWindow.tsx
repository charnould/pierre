import { X } from 'lucide-react'
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { DesktopChatBody } from '@/features/chat/DesktopChatBody'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

const WINDOW_MARGIN = 8
const FALLBACK_TITLEBAR_HEIGHT = 32
const MIN_SIZE = { width: 320, height: 320 }
const RESIZE_STEP = 16
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface WindowGeometry {
  position: Position
  size: Size
}

interface GeometryBounds {
  minY: number
  viewportHeight: number
  viewportWidth: number
}

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

const RESIZE_ZONES: Array<{ direction: ResizeDirection; className: string }> = [
  { direction: 'n', className: 'top-0 right-3 left-3 h-2 cursor-ns-resize' },
  { direction: 'ne', className: 'top-0 right-0 size-3 cursor-nesw-resize' },
  { direction: 'e', className: 'top-3 right-0 bottom-3 w-2 cursor-ew-resize' },
  { direction: 'se', className: 'right-0 bottom-0 size-3 cursor-nwse-resize' },
  { direction: 's', className: 'right-3 bottom-0 left-3 h-2 cursor-ns-resize' },
  { direction: 'sw', className: 'bottom-0 left-0 size-3 cursor-nesw-resize' },
  { direction: 'w', className: 'top-3 bottom-3 left-0 w-2 cursor-ew-resize' },
  { direction: 'nw', className: 'top-0 left-0 size-3 cursor-nwse-resize' }
]

export function clampChatWindowGeometry(
  geometry: WindowGeometry,
  bounds: GeometryBounds
): WindowGeometry {
  const maxWidth = Math.max(0, bounds.viewportWidth - WINDOW_MARGIN * 2)
  const maxHeight = Math.max(0, bounds.viewportHeight - bounds.minY - WINDOW_MARGIN)
  const size = {
    width: Math.min(Math.max(MIN_SIZE.width, geometry.size.width), maxWidth),
    height: Math.min(Math.max(MIN_SIZE.height, geometry.size.height), maxHeight)
  }
  const maxX = Math.max(WINDOW_MARGIN, bounds.viewportWidth - size.width - WINDOW_MARGIN)
  const maxY = Math.max(bounds.minY, bounds.viewportHeight - size.height - WINDOW_MARGIN)
  return {
    position: {
      x: Math.min(Math.max(WINDOW_MARGIN, geometry.position.x), maxX),
      y: Math.min(Math.max(bounds.minY, geometry.position.y), maxY)
    },
    size
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function resizeChatWindowGeometry(
  geometry: WindowGeometry,
  direction: ResizeDirection,
  delta: Position,
  bounds: GeometryBounds
): WindowGeometry {
  const base = clampChatWindowGeometry(geometry, bounds)
  let left = base.position.x
  let top = base.position.y
  let right = left + base.size.width
  let bottom = top + base.size.height
  const maxRight = bounds.viewportWidth - WINDOW_MARGIN
  const maxBottom = bounds.viewportHeight - WINDOW_MARGIN

  if (direction.includes('e')) {
    right = clamp(right + delta.x, left + MIN_SIZE.width, maxRight)
  }
  if (direction.includes('w')) {
    left = clamp(left + delta.x, WINDOW_MARGIN, right - MIN_SIZE.width)
  }
  if (direction.includes('s')) {
    bottom = clamp(bottom + delta.y, top + MIN_SIZE.height, maxBottom)
  }
  if (direction.includes('n')) {
    top = clamp(top + delta.y, bounds.minY, bottom - MIN_SIZE.height)
  }

  return {
    position: { x: left, y: top },
    size: { width: right - left, height: bottom - top }
  }
}

function chatWindowMinY(): number {
  const titlebar = document.querySelector<HTMLElement>('[data-pierre-titlebar]')
  return (titlebar?.getBoundingClientRect().bottom ?? FALLBACK_TITLEBAR_HEIGHT) + WINDOW_MARGIN
}

interface Props {
  open: boolean
  agentName: string
  url?: string
  onClose: () => void
}

export function ChatWindow({ open, agentName, url, onClose }: Props) {
  const frameRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ offsetX: number; offsetY: number; size: Size } | null>(null)
  const resizeRef = useRef<{
    pointerX: number
    pointerY: number
    geometry: WindowGeometry
    direction: ResizeDirection
  } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [geometry, setGeometry] = useState<WindowGeometry | null>(null)

  const clampGeometry = useCallback((next: WindowGeometry): WindowGeometry => {
    return clampChatWindowGeometry(next, {
      minY: chatWindowMinY(),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const handleResize = () =>
      setGeometry((current) => {
        if (!current) return null
        const next = clampGeometry(current)
        return next.position.x === current.position.x &&
          next.position.y === current.position.y &&
          next.size.width === current.size.width &&
          next.size.height === current.size.height
          ? current
          : next
      })
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clampGeometry, open])

  const handleDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (event.target instanceof Element && event.target.closest('button')) return
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame) return
    dragRef.current = {
      offsetX: event.clientX - frame.left,
      offsetY: event.clientY - frame.top,
      size: { width: frame.width, height: frame.height }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const handleDragMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setGeometry(
      clampGeometry({
        position: {
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY
        },
        size: drag.size
      })
    )
  }

  const handleDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
  }

  const handleMoveKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.shiftKey) {
      const frame = frameRef.current?.getBoundingClientRect()
      if (!frame) return
      const resize = {
        ArrowDown: { direction: 's' as const, delta: { x: 0, y: RESIZE_STEP } },
        ArrowLeft: {
          direction: (isMac ? 'w' : 'e') as ResizeDirection,
          delta: { x: isMac ? RESIZE_STEP : -RESIZE_STEP, y: 0 }
        },
        ArrowRight: {
          direction: (isMac ? 'w' : 'e') as ResizeDirection,
          delta: { x: isMac ? -RESIZE_STEP : RESIZE_STEP, y: 0 }
        },
        ArrowUp: { direction: 's' as const, delta: { x: 0, y: -RESIZE_STEP } }
      }[event.key]
      if (!resize) return
      event.preventDefault()
      setGeometry(
        resizeChatWindowGeometry(
          {
            position: { x: frame.left, y: frame.top },
            size: { width: frame.width, height: frame.height }
          },
          resize.direction,
          resize.delta,
          {
            minY: chatWindowMinY(),
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth
          }
        )
      )
      return
    }
    const delta = {
      ArrowDown: { x: 0, y: 16 },
      ArrowLeft: { x: -16, y: 0 },
      ArrowRight: { x: 16, y: 0 },
      ArrowUp: { x: 0, y: -16 }
    }[event.key]
    if (!delta) return
    event.preventDefault()
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame) return
    setGeometry(
      clampGeometry({
        position: { x: frame.left + delta.x, y: frame.top + delta.y },
        size: { width: frame.width, height: frame.height }
      })
    )
  }

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const frame = frameRef.current?.getBoundingClientRect()
    const direction = event.currentTarget.dataset.chatResizeDirection as ResizeDirection | undefined
    if (!frame || !direction) return
    resizeRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      direction,
      geometry: {
        position: { x: frame.left, y: frame.top },
        size: { width: frame.width, height: frame.height }
      }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current
    if (!resize) return
    setGeometry(
      resizeChatWindowGeometry(
        resize.geometry,
        resize.direction,
        {
          x: event.clientX - resize.pointerX,
          y: event.clientY - resize.pointerY
        },
        {
          minY: chatWindowMinY(),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth
        }
      )
    )
  }

  const handleResizeEnd = (event: PointerEvent<HTMLDivElement>) => {
    resizeRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const windowStyle = geometry
    ? ({
        left: geometry.position.x,
        top: geometry.position.y,
        width: geometry.size.width,
        height: geometry.size.height
      } satisfies CSSProperties)
    : undefined

  return (
    <section
      ref={frameRef}
      role="dialog"
      aria-label="Discuter"
      data-chat-window=""
      hidden={!open}
      inert={!open}
      style={windowStyle}
      className={cn(
        'bg-background text-foreground fixed z-[60] flex h-[min(36rem,calc(100dvh-var(--titlebar-height)-1rem))] min-h-0 w-96 flex-col overflow-hidden rounded-xl border shadow-md',
        !geometry && cn('top-[calc(var(--titlebar-height)+0.5rem)]', isMac ? 'right-2' : 'left-2')
      )}
    >
      <div
        role="group"
        aria-label="Déplacer la conversation ; Maj + flèches pour redimensionner"
        tabIndex={0}
        className={cn(
          'border-border focus-visible:ring-ring/20 flex h-7 shrink-0 touch-none items-center border-b px-1 outline-none select-none focus-visible:ring-2',
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onKeyDown={handleMoveKey}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ms-auto"
          aria-label="Fermer la conversation"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <DesktopChatBody active={open} agentName={agentName} url={url} />

      {RESIZE_ZONES.map((zone) => (
        <div
          key={zone.direction}
          aria-hidden
          data-chat-resize-direction={zone.direction}
          className={cn('absolute z-20 touch-none', zone.className)}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
        />
      ))}
    </section>
  )
}
