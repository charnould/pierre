import { useReducedMotion } from 'motion/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react'

import {
  DEFAULT_MASCOT_BADGE_COLOR,
  DEFAULT_MASCOT_COLOR,
  DEFAULT_MASCOT_SHAPE,
  parseMascotColor,
  parseMascotShape,
  type MascotColor,
  type MascotShape
} from './look'
import { MascotSvg } from './MascotSvg'
import { useMascotLife } from './useMascotLife'

const DRAG_THRESHOLD_PX = 4

/**
 * Compagnon SVG : forme + couleurs poussées par le main, vie idle / orbit / pop locale.
 */
export function MascotApp() {
  const reduceMotion = useReducedMotion()
  const [unreadCount, setUnreadCount] = useState(0)
  const [shape, setShape] = useState<MascotShape>(DEFAULT_MASCOT_SHAPE)
  const [color, setColor] = useState<MascotColor>(DEFAULT_MASCOT_COLOR)
  const [badgeColor, setBadgeColor] = useState<MascotColor>(DEFAULT_MASCOT_BADGE_COLOR)
  const dragRef = useRef<{
    pointerId: number
    startScreenX: number
    startScreenY: number
    lastScreenX: number
    lastScreenY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    return window.api?.onMascotUnreadCount?.((count) => {
      setUnreadCount(typeof count === 'number' ? Math.max(0, count) : 0)
    })
  }, [])

  useEffect(() => {
    return window.api?.onMascotLook?.((look) => {
      const nextShape = parseMascotShape(look?.shape)
      const nextColor = parseMascotColor(look?.color)
      const nextBadge = parseMascotColor(look?.badgeColor)
      if (nextShape) setShape(nextShape)
      if (nextColor) setColor(nextColor)
      if (nextBadge) setBadgeColor(nextBadge)
    })
  }, [])

  const life = useMascotLife(unreadCount, reduceMotion)

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startScreenX: event.screenX,
      startScreenY: event.screenY,
      lastScreenX: event.screenX,
      lastScreenY: event.screenY,
      moved: false
    }
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const totalDx = event.screenX - drag.startScreenX
    const totalDy = event.screenY - drag.startScreenY
    if (!drag.moved && Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) return
    drag.moved = true

    const dx = event.screenX - drag.lastScreenX
    const dy = event.screenY - drag.lastScreenY
    drag.lastScreenX = event.screenX
    drag.lastScreenY = event.screenY
    if (dx === 0 && dy === 0) return
    void window.api?.setMascotBounds?.({ dx, dy, persist: false })
  }, [])

  const endDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (drag.moved) {
      void window.api?.setMascotBounds?.({ persist: true })
      return
    }

    void window.api?.activateFromMascot?.()
  }, [])

  const ariaLabel =
    unreadCount > 0
      ? `Compagnon Pierre — ${unreadCount} notification${unreadCount > 1 ? 's' : ''}`
      : 'Compagnon Pierre'

  return (
    <div className="flex size-full items-center justify-center bg-transparent">
      <button
        type="button"
        aria-label={ariaLabel}
        className="relative size-full cursor-grab overflow-visible border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onContextMenu={() => void window.api?.showMascotMenu?.()}
      >
        <MascotSvg
          shape={shape}
          color={color}
          badgeColor={badgeColor}
          gazeX={life.gazeX}
          gazeY={life.gazeY}
          blink={life.blink}
          squash={life.squash}
          showPastille={life.showPastille}
          pastilleScale={life.pastilleScale}
          orbitT={life.orbitT}
          className="size-full"
        />
      </button>
    </div>
  )
}
