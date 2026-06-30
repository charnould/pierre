type HostRect = {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

const MODAL_ID = 'pierre-embed-modal'
const MODAL_SHELL_ID = 'pierre-embed-modal-shell'
const MODAL_BODY_ID = 'pierre-embed-modal-body'
const MODAL_CHAT_ID = 'pierre-embed-modal-chat'
const MODAL_CLOSE_ID = 'pierre-embed-modal-close'

const HOST_INBOUND_TYPES = new Set(['pierre:probe', 'pierre:open'])

let pierre_is_open = false
let pierre_is_animating = false
let active_host_rect: HostRect | null = null
let focus_trap_handler: ((event: KeyboardEvent) => void) | null = null
let configuration: string
let url: string
let host_origin = ''

const EASING_OPEN = 'cubic-bezier(0.34, 1.28, 0.64, 1)'
const EASING_CLOSE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const REDUCED_MOTION_MS = 150

const TIMING = {
  open: {
    scrim: 300,
    shell: 400,
    shellDelay: 0,
    content: 180,
    contentDelay: 200,
    close: 160,
    closeDelay: 160
  },
  close: {
    scrim: 220,
    shell: 280,
    shellDelay: 0,
    content: 100,
    contentDelay: 0,
    close: 100,
    closeDelay: 0
  }
} as const

type DockMetrics = { tx: number; ty: number; scale: number; dist: number }

type TimelineElements = {
  wrapper: HTMLElement
  container: HTMLElement
  content: HTMLElement
  close: HTMLButtonElement
  metrics: DockMetrics
}

const prefers_reduced_motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const waitAnimation = (animation: Animation) => animation.finished.catch(() => undefined)
const afterLayout = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )

const overshootFor = (dist: number) => (dist > 400 ? 1.016 : 1.022)
const shellTransform = (tx: number, ty: number, scale: number) =>
  `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`

const measureDockFlipFromRect = (rect: DOMRect, container: DOMRect): DockMetrics => {
  const btn_cx = rect.left + rect.width / 2
  const btn_cy = rect.top + rect.height / 2
  const box_cx = container.left + container.width / 2
  const box_cy = container.top + container.height / 2
  const tx = btn_cx - box_cx
  const ty = btn_cy - box_cy
  return {
    tx,
    ty,
    scale: Math.min(rect.width / container.width, rect.height / container.height),
    dist: Math.hypot(tx, ty)
  }
}

const buildShellKeyframes = (metrics: DockMetrics, direction: 'in' | 'out') => {
  const { tx, ty, scale, dist } = metrics
  if (direction === 'in') {
    const peak = overshootFor(dist)
    return [
      { transform: shellTransform(tx, ty, scale) },
      { transform: shellTransform(0, 0, peak), offset: 0.72 },
      { transform: shellTransform(0, 0, 1) }
    ]
  }
  return [{ transform: shellTransform(0, 0, 1) }, { transform: shellTransform(tx, ty, scale) }]
}

const animateScrim = (
  wrapper: HTMLElement,
  direction: 'in' | 'out',
  duration: number,
  delay: number
): Animation => {
  const easing = direction === 'in' ? EASING_OPEN : EASING_CLOSE
  return wrapper.animate(
    direction === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
    {
      duration: prefers_reduced_motion() ? REDUCED_MOTION_MS : duration,
      delay,
      easing: prefers_reduced_motion() ? 'ease' : easing,
      fill: 'forwards'
    }
  )
}

const animateShell = (
  container: HTMLElement,
  metrics: DockMetrics,
  direction: 'in' | 'out',
  duration: number,
  delay: number
): Animation => {
  const easing = direction === 'in' ? EASING_OPEN : EASING_CLOSE
  container.style.transformOrigin = 'center center'
  container.style.willChange = 'transform'
  if (prefers_reduced_motion()) {
    return container.animate(
      direction === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: REDUCED_MOTION_MS, easing: 'ease', fill: 'forwards' }
    )
  }
  return container.animate(buildShellKeyframes(metrics, direction), {
    duration,
    delay,
    easing,
    fill: 'forwards'
  })
}

const animateContent = (
  content: HTMLElement,
  direction: 'in' | 'out',
  duration: number,
  delay: number
): Animation => {
  const easing = direction === 'in' ? EASING_OPEN : EASING_CLOSE
  if (prefers_reduced_motion()) {
    return content.animate(
      direction === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: REDUCED_MOTION_MS, delay, easing: 'ease', fill: 'forwards' }
    )
  }
  return content.animate(
    direction === 'in'
      ? [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ]
      : [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(8px)' }
        ],
    { duration, delay, easing, fill: 'forwards' }
  )
}

const animateCloseButton = (
  close: HTMLButtonElement,
  direction: 'in' | 'out',
  duration: number,
  delay: number
): Animation => {
  const easing = direction === 'in' ? EASING_OPEN : EASING_CLOSE
  if (prefers_reduced_motion()) {
    return close.animate(
      direction === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: REDUCED_MOTION_MS, delay, easing: 'ease', fill: 'forwards' }
    )
  }
  return close.animate(
    direction === 'in'
      ? [
          { opacity: 0, transform: 'scale(0.88)' },
          { opacity: 1, transform: 'scale(1)' }
        ]
      : [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(0.88)' }
        ],
    { duration, delay, easing, fill: 'forwards' }
  )
}

const animateTimeline = async (elements: TimelineElements, direction: 'in' | 'out') => {
  const timing = direction === 'in' ? TIMING.open : TIMING.close
  await Promise.all([
    waitAnimation(animateScrim(elements.wrapper, direction, timing.scrim, 0)),
    waitAnimation(
      animateShell(elements.container, elements.metrics, direction, timing.shell, timing.shellDelay)
    ),
    waitAnimation(animateContent(elements.content, direction, timing.content, timing.contentDelay)),
    waitAnimation(animateCloseButton(elements.close, direction, timing.close, timing.closeDelay))
  ])
}

const trapFocus = (wrapper: HTMLElement) => {
  const getFocusables = (): HTMLElement[] => {
    const close = wrapper.querySelector<HTMLElement>(`#${MODAL_CLOSE_ID}`)
    return close ? [close] : []
  }

  focus_trap_handler = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const focusables = getFocusables()
    if (!focusables.length) return

    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  wrapper.addEventListener('keydown', focus_trap_handler)
}

const releaseFocusTrap = (wrapper: HTMLElement) => {
  if (focus_trap_handler) {
    wrapper.removeEventListener('keydown', focus_trap_handler)
    focus_trap_handler = null
  }
}

const parseHostOrigin = (): string => {
  const raw = new URLSearchParams(window.location.search).get('host') ?? ''
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.origin
  } catch {
    return ''
  }
}

const isValidHostRect = (rect: unknown): rect is HostRect => {
  if (!rect || typeof rect !== 'object') return false
  const candidate = rect as Record<string, unknown>
  return ['top', 'left', 'width', 'height', 'bottom', 'right'].every(
    (key) => typeof candidate[key] === 'number' && Number.isFinite(candidate[key])
  )
}

const postToHost = (message: object) => {
  if (window.parent === window || !host_origin) return
  window.parent.postMessage(message, host_origin)
}

const isTrustedHostMessage = (event: MessageEvent): boolean => {
  const type = event.data?.type
  return (
    event.source === window.parent &&
    !!host_origin &&
    event.origin === host_origin &&
    typeof type === 'string' &&
    HOST_INBOUND_TYPES.has(type)
  )
}

const notifyHostClosed = () => postToHost({ type: 'pierre:closed' })
const notifyHostClosing = () => postToHost({ type: 'pierre:closing' })
const notifyHostOpenCancelled = () => postToHost({ type: 'pierre:open-cancelled' })

const openModal = async (host_rect: HostRect) => {
  if (pierre_is_open || pierre_is_animating) return

  const chat_iframe = document.getElementById(MODAL_CHAT_ID)
  if (!chat_iframe) return

  pierre_is_animating = true
  active_host_rect = host_rect

  const wrapper = document.createElement('div')
  wrapper.id = MODAL_ID
  wrapper.setAttribute('role', 'dialog')
  wrapper.setAttribute('aria-modal', 'true')
  wrapper.setAttribute('aria-label', 'Assistant PIERRE')

  const container = document.createElement('div')
  container.id = MODAL_SHELL_ID

  const content = document.createElement('div')
  content.id = MODAL_BODY_ID

  chat_iframe.style.display = 'block'
  content.appendChild(chat_iframe)

  const close = document.createElement('button')
  close.type = 'button'
  close.id = MODAL_CLOSE_ID
  close.setAttribute('aria-label', 'Fermer')
  close.innerHTML = '<span aria-hidden="true">✕</span>'

  container.append(close, content)
  wrapper.appendChild(container)
  document.body.appendChild(wrapper)
  trapFocus(wrapper)

  try {
    await afterLayout()
    const metrics = measureDockFlipFromRect(host_rect, container.getBoundingClientRect())
    await animateTimeline({ wrapper, container, content, close, metrics }, 'in')
    container.style.willChange = ''
    close.focus()
    pierre_is_open = true
  } catch {
    releaseFocusTrap(wrapper)
    chat_iframe.style.display = 'none'
    document.body.appendChild(chat_iframe)
    wrapper.remove()
    active_host_rect = null
    notifyHostOpenCancelled()
  } finally {
    pierre_is_animating = false
  }
}

const close_modal = async () => {
  if (!pierre_is_open || pierre_is_animating || !active_host_rect) return

  pierre_is_animating = true

  const wrapper = document.getElementById(MODAL_ID)
  const container = document.getElementById(MODAL_SHELL_ID)
  const content = document.getElementById(MODAL_BODY_ID)
  const close = document.getElementById(MODAL_CLOSE_ID) as HTMLButtonElement | null
  const chat_iframe = document.getElementById(MODAL_CHAT_ID)
  const host_rect = active_host_rect

  if (!wrapper || !container || !content || !close || !chat_iframe) {
    pierre_is_animating = false
    return
  }

  notifyHostClosing()

  const metrics = measureDockFlipFromRect(host_rect, container.getBoundingClientRect())
  await animateTimeline({ wrapper, container, content, close, metrics }, 'out')

  releaseFocusTrap(wrapper)

  chat_iframe.style.display = 'none'
  document.body.appendChild(chat_iframe)

  container.style.transform = ''
  container.style.opacity = ''
  container.style.borderRadius = ''
  container.style.boxShadow = ''
  container.style.transformOrigin = ''
  container.style.willChange = ''
  content.style.opacity = ''
  content.style.transform = ''
  close.style.opacity = ''
  close.style.transform = ''

  wrapper.remove()
  active_host_rect = null
  pierre_is_open = false
  pierre_is_animating = false
  notifyHostClosed()
}

document.addEventListener('DOMContentLoaded', () => {
  configuration = document.body.dataset.pierreConfig ?? 'default'
  url = window.location.origin
  host_origin = parseHostOrigin()

  const preloaded_iframe = document.createElement('iframe')
  preloaded_iframe.src = `${url}/c?config=${encodeURIComponent(configuration)}&data=`
  preloaded_iframe.style.display = 'none'
  preloaded_iframe.id = MODAL_CHAT_ID
  document.body.appendChild(preloaded_iframe)

  window.addEventListener('message', (event) => {
    if (!isTrustedHostMessage(event)) return

    const type = event.data.type as string
    if (type === 'pierre:probe') {
      postToHost({ type: 'pierre:ready' })
      return
    }
    if (type !== 'pierre:open') return
    if (!isValidHostRect(event.data.rect)) return
    void openModal(event.data.rect)
  })

  if (host_origin) postToHost({ type: 'pierre:ready' })
})

document.addEventListener('click', (event) => {
  if (!pierre_is_open || pierre_is_animating) return
  const target = event.target as HTMLElement
  if (target.id === MODAL_ID && !target.closest(`#${MODAL_SHELL_ID}`)) {
    void close_modal()
    return
  }
  if (target.closest(`#${MODAL_CLOSE_ID}`)) void close_modal()
})

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (pierre_is_open && !pierre_is_animating && event.key === 'Escape') void close_modal()
})
