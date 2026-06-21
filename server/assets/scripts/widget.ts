import { WIDGET_CSS } from './widget.styles.gen.ts'

/** Initial state */
let pierre_is_open = false
let pierre_is_animating = false
let active_launcher: HTMLElement | null = null
let focus_trap_handler: ((event: KeyboardEvent) => void) | null = null
let scroll_lock_padding = ''
let overscroll_lock = ''
const inerted_nodes: Element[] = []
const recessed_nodes: HTMLElement[] = []
let configuration: string
let url: string

const EASING_OPEN = 'cubic-bezier(0.34, 1.28, 0.64, 1)'
const EASING_CLOSE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const REDUCED_MOTION_MS = 150

const TIMING = {
  open: {
    scrim: 300,
    shell: 400,
    shellDelay: 0,
    launcher: 160,
    launcherDelay: 40,
    content: 180,
    contentDelay: 200,
    close: 160,
    closeDelay: 160
  },
  close: {
    scrim: 220,
    shell: 280,
    shellDelay: 0,
    launcher: 180,
    launcherDelay: 0,
    content: 100,
    contentDelay: 0,
    close: 100,
    closeDelay: 0
  }
} as const

const BACKDROP_SCALE = 0.97
const BACKDROP_BLUR_PX = 2
const RECEDE_NODE_CAP = 12

type DockMetrics = {
  tx: number
  ty: number
  scale: number
  dist: number
}

type TimelineElements = {
  wrapper: HTMLElement
  container: HTMLElement
  content: HTMLElement
  close: HTMLButtonElement
  launcher: HTMLElement
  metrics: DockMetrics
}

const prefers_reduced_motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const is_mobile = () => window.matchMedia('(max-width: 600px)').matches

const waitAnimation = (animation: Animation) => animation.finished.catch(() => undefined)

const afterLayout = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )

const findLauncher = (from: HTMLElement): HTMLElement | null =>
  from.closest('.pierre-ia') ?? from.closest('#pierre-ia')

const readLauncherBaseTransform = (button: HTMLElement): string => {
  const inline = button.style.transform
  if (inline && inline !== 'none') return inline

  const computed = getComputedStyle(button).transform
  return computed !== 'none' ? computed : ''
}

const composeLauncherTransform = (base: string, scale: number): string => {
  const suffix = `scale(${scale})`
  if (!base || base === 'none') return suffix
  return `${base} ${suffix}`
}

const cacheLauncherBaseTransform = (button: HTMLElement) => {
  if (!button.dataset.pierreBaseTransform) {
    button.dataset.pierreBaseTransform = readLauncherBaseTransform(button)
  }
}

const applyLauncherVisual = (
  button: HTMLElement,
  state: 'rest' | 'hover' | 'pressed' | 'hidden'
) => {
  if (pierre_is_animating) return

  cacheLauncherBaseTransform(button)
  const base = button.dataset.pierreBaseTransform ?? ''

  if (state === 'hidden') {
    button.style.opacity = '0'
    button.style.transform = composeLauncherTransform(base, 0.92)
    return
  }

  button.style.opacity = ''
  const scale = state === 'pressed' ? 0.96 : state === 'hover' ? 1.08 : 1
  button.style.transform = scale === 1 ? base : composeLauncherTransform(base, scale)
}

const resetLauncher = (button: HTMLElement) => {
  button.style.opacity = ''
  button.style.transform = button.dataset.pierreBaseTransform ?? ''
  button.style.pointerEvents = ''
  button.classList.remove('pierre-ia--disabled')
  button.removeAttribute('aria-hidden')
}

const getAllLaunchers = () => document.querySelectorAll<HTMLElement>('.pierre-ia, #pierre-ia')

const hideInactiveLaunchers = (active: HTMLElement) => {
  getAllLaunchers().forEach((launcher) => {
    if (launcher === active) return
    launcher.style.opacity = '0'
    launcher.style.pointerEvents = 'none'
    launcher.setAttribute('aria-hidden', 'true')
    launcher.classList.add('pierre-ia--disabled')
  })
}

const restoreAllLaunchers = () => {
  getAllLaunchers().forEach(resetLauncher)
}

const overshootFor = (dist: number) => (dist > 400 ? 1.016 : 1.022)

const shellTransform = (tx: number, ty: number, scale: number) =>
  `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`

const measureDockFlip = (button: HTMLElement, container: DOMRect): DockMetrics => {
  const btn = button.getBoundingClientRect()
  const btn_cx = btn.left + btn.width / 2
  const btn_cy = btn.top + btn.height / 2
  const box_cx = container.left + container.width / 2
  const box_cy = container.top + container.height / 2

  const tx = btn_cx - box_cx
  const ty = btn_cy - box_cy

  return {
    tx,
    ty,
    scale: Math.min(btn.width / container.width, btn.height / container.height),
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

const isBackgroundExcluded = (element: Element, wrapper: HTMLElement) => {
  if (element === wrapper || element.id === 'pierre-iframe') return true
  const el = element as HTMLElement
  return el.classList.contains('pierre-ia') || el.id === 'pierre-ia'
}

const setRecedeBackground = (wrapper: HTMLElement) => {
  for (const child of document.body.children) {
    if (isBackgroundExcluded(child, wrapper)) continue
    recessed_nodes.push(child as HTMLElement)
    if (recessed_nodes.length >= RECEDE_NODE_CAP) break
  }
}

const animateRecede = async (direction: 'in' | 'out', duration: number, delay: number) => {
  if (prefers_reduced_motion() || recessed_nodes.length === 0) return

  const easing = direction === 'in' ? EASING_OPEN : EASING_CLOSE
  const to_scale = `scale(${BACKDROP_SCALE})`
  const to_blur = `blur(${BACKDROP_BLUR_PX}px)`
  const scale_only = is_mobile()

  await Promise.all(
    recessed_nodes.map((element) => {
      element.style.transformOrigin = 'center center'
      element.style.willChange = scale_only ? 'transform' : 'transform, filter'

      const keyframes =
        direction === 'in'
          ? scale_only
            ? [{ transform: 'scale(1)' }, { transform: to_scale }]
            : [
                { transform: 'scale(1)', filter: 'blur(0px)' },
                { transform: to_scale, filter: to_blur }
              ]
          : scale_only
            ? [{ transform: to_scale }, { transform: 'scale(1)' }]
            : [
                { transform: to_scale, filter: to_blur },
                { transform: 'scale(1)', filter: 'blur(0px)' }
              ]

      return waitAnimation(
        element.animate(keyframes, { duration, delay, easing, fill: 'forwards' })
      )
    })
  )
}

const clearRecedeWillChange = () => {
  for (const element of recessed_nodes) {
    element.style.willChange = ''
  }
}

const clearRecedeBackground = () => {
  for (const element of recessed_nodes) {
    element.style.transform = ''
    element.style.filter = ''
    element.style.transformOrigin = ''
    element.style.willChange = ''
  }
  recessed_nodes.length = 0
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

const animateLauncherTimeline = (
  button: HTMLElement,
  direction: 'in' | 'out',
  duration: number,
  delay: number
): Animation => {
  cacheLauncherBaseTransform(button)
  const base = button.dataset.pierreBaseTransform ?? ''
  const easing = direction === 'in' ? EASING_OPEN : EASING_CLOSE

  if (prefers_reduced_motion()) return button.animate([], { duration: 0 })

  if (direction === 'in') {
    return button.animate(
      [
        { opacity: 1, transform: base || 'none' },
        { opacity: 0, transform: composeLauncherTransform(base, 0.92), offset: 0.7 },
        { opacity: 0, transform: composeLauncherTransform(base, 0.92) }
      ],
      { duration, delay, easing, fill: 'forwards' }
    )
  }

  return button.animate(
    [
      { opacity: 0, transform: composeLauncherTransform(base, 0.92) },
      { opacity: 1, transform: base || 'none' }
    ],
    { duration, delay, easing, fill: 'forwards' }
  )
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
    waitAnimation(
      animateScrim(elements.wrapper, direction, timing.scrim, direction === 'in' ? 0 : 0)
    ),
    animateRecede(direction, timing.scrim, 0),
    waitAnimation(
      animateShell(elements.container, elements.metrics, direction, timing.shell, timing.shellDelay)
    ),
    waitAnimation(
      animateLauncherTimeline(elements.launcher, direction, timing.launcher, timing.launcherDelay)
    ),
    waitAnimation(animateContent(elements.content, direction, timing.content, timing.contentDelay)),
    waitAnimation(animateCloseButton(elements.close, direction, timing.close, timing.closeDelay))
  ])
}

const lockBodyScroll = () => {
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  scroll_lock_padding = document.body.style.paddingRight
  overscroll_lock = document.documentElement.style.overscrollBehavior
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overscrollBehavior = 'none'
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
}

const unlockBodyScroll = () => {
  document.body.style.overflow = ''
  document.body.style.paddingRight = scroll_lock_padding
  document.documentElement.style.overscrollBehavior = overscroll_lock
}

const setInertBackground = (wrapper: HTMLElement) => {
  for (const child of document.body.children) {
    if (isBackgroundExcluded(child, wrapper)) continue

    if ('inert' in child) {
      ;(child as HTMLElement).inert = true
      inerted_nodes.push(child)
    } else {
      child.setAttribute('aria-hidden', 'true')
      inerted_nodes.push(child)
    }
  }
}

const clearInertBackground = () => {
  for (const node of inerted_nodes) {
    if ('inert' in node) (node as HTMLElement).inert = false
    else node.removeAttribute('aria-hidden')
  }
  inerted_nodes.length = 0
}

const trapFocus = (wrapper: HTMLElement) => {
  const getFocusables = (): HTMLElement[] => {
    const close = wrapper.querySelector<HTMLElement>('#pierre-close')
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

const hapticOpen = () => {
  if (prefers_reduced_motion()) return
  if ('vibrate' in navigator) navigator.vibrate(5)
}

const initLaunchers = () => {
  document
    .querySelectorAll<HTMLElement>('.pierre-ia, #pierre-ia')
    .forEach(cacheLauncherBaseTransform)
}

const openModal = async (button: HTMLElement) => {
  if (pierre_is_open || pierre_is_animating) return

  const iframe = document.getElementById('pierre-iframe')
  if (!iframe) return

  pierre_is_animating = true
  active_launcher = button
  cacheLauncherBaseTransform(button)
  button.classList.add('pierre-ia--disabled')

  const wrapper = document.createElement('div')
  wrapper.id = 'pierre-wrapper'
  wrapper.setAttribute('role', 'dialog')
  wrapper.setAttribute('aria-modal', 'true')
  wrapper.setAttribute('aria-label', 'Assistant PIERRE')

  const container = document.createElement('div')
  container.id = 'pierre-iframe-container'

  const content = document.createElement('div')
  content.id = 'pierre-iframe-content'

  iframe.style.display = 'block'
  content.appendChild(iframe)

  const close = document.createElement('button')
  close.type = 'button'
  close.id = 'pierre-close'
  close.setAttribute('aria-label', 'Fermer')
  close.innerHTML = '<span aria-hidden="true">✕</span>'

  container.append(close, content)
  wrapper.appendChild(container)
  document.body.appendChild(wrapper)

  lockBodyScroll()
  setRecedeBackground(wrapper)
  setInertBackground(wrapper)
  hideInactiveLaunchers(button)
  trapFocus(wrapper)
  hapticOpen()

  try {
    await afterLayout()

    const metrics = measureDockFlip(button, container.getBoundingClientRect())

    await animateTimeline({ wrapper, container, content, close, launcher: button, metrics }, 'in')

    container.style.willChange = ''
    clearRecedeWillChange()
    close.focus()
    pierre_is_open = true
  } catch {
    releaseFocusTrap(wrapper)
    clearInertBackground()
    clearRecedeBackground()
    unlockBodyScroll()
    restoreAllLaunchers()
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    wrapper.remove()
    active_launcher = null
  } finally {
    pierre_is_animating = false
  }
}

const close_modal = async () => {
  if (!pierre_is_open || pierre_is_animating) return

  pierre_is_animating = true

  const wrapper = document.getElementById('pierre-wrapper')
  const container = document.getElementById('pierre-iframe-container')
  const content = document.getElementById('pierre-iframe-content')
  const close = document.getElementById('pierre-close') as HTMLButtonElement | null
  const iframe = document.getElementById('pierre-iframe')
  const button = active_launcher

  if (!wrapper || !container || !content || !close || !iframe || !button) {
    pierre_is_animating = false
    return
  }

  const metrics = measureDockFlip(button, container.getBoundingClientRect())

  await animateTimeline({ wrapper, container, content, close, launcher: button, metrics }, 'out')

  releaseFocusTrap(wrapper)
  clearInertBackground()
  clearRecedeBackground()
  unlockBodyScroll()

  iframe.style.display = 'none'
  document.body.appendChild(iframe)

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

  restoreAllLaunchers()
  button.focus()
  wrapper.remove()

  active_launcher = null
  pierre_is_open = false
  pierre_is_animating = false
}

document.addEventListener('DOMContentLoaded', () => {
  const css = document.createElement('style')
  css.innerText = WIDGET_CSS
  document.head.appendChild(css)

  const pierre_button = document.querySelector<HTMLElement>('.pierre-ia, #pierre-ia')
  configuration = pierre_button?.dataset.configuration ?? 'default'
  url = pierre_button?.dataset.url ?? 'https://assistant.pierre-ia.org'

  const preloaded_iframe = document.createElement('iframe')
  preloaded_iframe.src = `${url}/?config=${configuration}`
  preloaded_iframe.style.display = 'none'
  preloaded_iframe.id = 'pierre-iframe'
  document.body.appendChild(preloaded_iframe)

  initLaunchers()
})

document.addEventListener(
  'pointerover',
  (event) => {
    const launcher = findLauncher(event.target as HTMLElement)
    if (!launcher || pierre_is_open || pierre_is_animating) return
    applyLauncherVisual(launcher, 'hover')
  },
  true
)

document.addEventListener(
  'pointerout',
  (event) => {
    const launcher = findLauncher(event.target as HTMLElement)
    if (!launcher || pierre_is_open || pierre_is_animating) return
    const related = event.relatedTarget as Node | null
    if (related && launcher.contains(related)) return
    applyLauncherVisual(launcher, 'rest')
  },
  true
)

document.addEventListener(
  'pointerdown',
  (event) => {
    const launcher = findLauncher(event.target as HTMLElement)
    if (!launcher || pierre_is_open || pierre_is_animating) return
    applyLauncherVisual(launcher, 'pressed')
  },
  true
)

document.addEventListener(
  'pointerup',
  (event) => {
    const launcher = findLauncher(event.target as HTMLElement)
    if (!launcher || pierre_is_open || pierre_is_animating) return
    applyLauncherVisual(launcher, 'hover')
  },
  true
)

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const launcher = findLauncher(target)

  if (launcher && !pierre_is_open && !pierre_is_animating) {
    void openModal(launcher)
    return
  }

  if (!pierre_is_open || pierre_is_animating) return

  if (target.id === 'pierre-wrapper' && !target.closest('#pierre-iframe-container')) {
    void close_modal()
    return
  }

  if (target.closest('#pierre-close')) {
    void close_modal()
  }
})

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (pierre_is_open && !pierre_is_animating && event.key === 'Escape') {
    void close_modal()
  }
})
