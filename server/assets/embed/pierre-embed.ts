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
const MODAL_CLOSE_ID = 'pierre-embed-modal-close'

const HOST_INBOUND_TYPES = new Set(['pierre:probe', 'pierre:open'])

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

let pierre_is_open = false
let pierre_is_animating = false
let active_host_rect: HostRect | null = null
let focus_trap_handler: ((event: KeyboardEvent) => void) | null = null
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

type ModalElements = {
  wrapper: HTMLElement
  container: HTMLElement
  content: HTMLElement
  close: HTMLButtonElement
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

const getModalElements = (): ModalElements | null => {
  const wrapper = document.getElementById(MODAL_ID)
  const container = document.getElementById(MODAL_SHELL_ID)
  const content = document.getElementById(MODAL_BODY_ID)
  const close = document.getElementById(MODAL_CLOSE_ID)
  if (
    !(wrapper instanceof HTMLElement) ||
    !(container instanceof HTMLElement) ||
    !(content instanceof HTMLElement) ||
    !(close instanceof HTMLButtonElement)
  ) {
    return null
  }
  return { wrapper, container, content, close }
}

const cancelModalAnimations = (elements: ModalElements) => {
  for (const node of [elements.wrapper, elements.container, elements.content, elements.close]) {
    for (const animation of node.getAnimations()) animation.cancel()
  }
}

const resetModalInlineStyles = (elements: ModalElements) => {
  elements.container.style.transform = ''
  elements.container.style.opacity = ''
  elements.container.style.borderRadius = ''
  elements.container.style.boxShadow = ''
  elements.container.style.transformOrigin = ''
  elements.container.style.willChange = ''
  elements.content.style.opacity = ''
  elements.content.style.transform = ''
  elements.close.style.opacity = ''
  elements.close.style.transform = ''
}

const hideModal = (elements: ModalElements) => {
  cancelModalAnimations(elements)
  resetModalInlineStyles(elements)
  elements.wrapper.hidden = true
  elements.wrapper.setAttribute('aria-hidden', 'true')
}

const getFocusables = (wrapper: HTMLElement): HTMLElement[] =>
  [...wrapper.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true'
  )

const trapFocus = (wrapper: HTMLElement) => {
  focus_trap_handler = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const focusables = getFocusables(wrapper)
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

  const elements = getModalElements()
  if (!elements) return

  pierre_is_animating = true
  active_host_rect = host_rect
  cancelModalAnimations(elements)
  resetModalInlineStyles(elements)
  elements.wrapper.hidden = false
  elements.wrapper.setAttribute('aria-hidden', 'false')
  trapFocus(elements.wrapper)

  try {
    await afterLayout()
    const metrics = measureDockFlipFromRect(host_rect, elements.container.getBoundingClientRect())
    await animateTimeline({ ...elements, metrics }, 'in')
    elements.container.style.willChange = ''
    elements.close.focus()
    pierre_is_open = true
  } catch {
    releaseFocusTrap(elements.wrapper)
    hideModal(elements)
    active_host_rect = null
    notifyHostOpenCancelled()
  } finally {
    pierre_is_animating = false
  }
}

const close_modal = async () => {
  if (!pierre_is_open || pierre_is_animating || !active_host_rect) return

  const elements = getModalElements()
  const host_rect = active_host_rect
  if (!elements) {
    pierre_is_animating = false
    return
  }

  pierre_is_animating = true
  notifyHostClosing()

  const metrics = measureDockFlipFromRect(host_rect, elements.container.getBoundingClientRect())
  await animateTimeline({ ...elements, metrics }, 'out')

  releaseFocusTrap(elements.wrapper)
  hideModal(elements)
  active_host_rect = null
  pierre_is_open = false
  pierre_is_animating = false
  notifyHostClosed()
}

document.addEventListener('DOMContentLoaded', () => {
  host_origin = parseHostOrigin()

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
