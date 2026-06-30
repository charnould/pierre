type HostRect = {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

const EMBED_ID = 'pierre-embed'
const EMBED_Z_INDEX_OPEN = '2147483647'
const EMBED_Z_INDEX_CLOSED = '-1'

const EMBED_OUTBOUND_TYPES = new Set([
  'pierre:ready',
  'pierre:closing',
  'pierre:closed',
  'pierre:open-cancelled'
])

const EASING_OPEN = 'cubic-bezier(0.34, 1.28, 0.64, 1)'
const EASING_CLOSE = 'cubic-bezier(0.4, 0, 0.2, 1)'

const TIMING = {
  open: {
    scrim: 300,
    launcher: 160,
    launcherDelay: 40
  },
  close: {
    scrim: 220,
    launcher: 180,
    launcherDelay: 0
  }
} as const

const BACKDROP_SCALE = 0.97
const BACKDROP_BLUR_PX = 2
const RECEDE_NODE_CAP = 12

const host_script =
  (document.currentScript as HTMLScriptElement | null) ??
  document.querySelector<HTMLScriptElement>('script[data-pierre-config]') ??
  document.querySelector<HTMLScriptElement>('script[src$="/pierre.js"]')

const settings = (): { url: string; configuration: string } => {
  const script_src = host_script?.src ?? ''
  const script_url = script_src ? new URL(script_src) : null

  return {
    url: script_url?.origin ?? '',
    configuration: host_script?.dataset.pierreConfig ?? 'default'
  }
}

const embed_iframe_style = (open: boolean) =>
  [
    'position:fixed',
    'inset:0',
    'width:100%',
    'height:100%',
    'border:0',
    `z-index:${open ? EMBED_Z_INDEX_OPEN : EMBED_Z_INDEX_CLOSED}`,
    'background:transparent',
    `pointer-events:${open ? 'auto' : 'none'}`,
    'color-scheme:normal'
  ].join(';')

let scroll_lock_padding = ''
let scroll_lock_overflow = ''
let overscroll_lock = ''
type InertSnapshot = {
  node: Element
  hadInert: boolean
  inertValue: boolean
  hadAriaHidden: boolean
  ariaHiddenValue: string | null
}
const inerted_nodes: InertSnapshot[] = []
const recessed_nodes: HTMLElement[] = []
const recessed_style_snapshots = new WeakMap<
  HTMLElement,
  {
    transform: string
    filter: string
    transformOrigin: string
    willChange: string
  }
>()
let host_close_anim: Promise<void> | null = null

const prefers_reduced_motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const is_mobile = () => window.matchMedia('(max-width: 600px)').matches
const waitAnimation = (animation: Animation) => animation.finished.catch(() => undefined)

const getAllLaunchers = () => document.querySelectorAll<HTMLElement>('[data-pierre-open]')

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

const resetLauncher = (button: HTMLElement) => {
  button.style.opacity = ''
  button.style.transform = button.dataset.pierreBaseTransform ?? ''
  button.style.pointerEvents = ''
  button.removeAttribute('aria-hidden')
}

const hideInactiveLaunchers = (active: HTMLElement) => {
  getAllLaunchers().forEach((launcher) => {
    if (launcher === active) return
    launcher.style.opacity = '0'
    launcher.style.pointerEvents = 'none'
    launcher.setAttribute('aria-hidden', 'true')
  })
}

const restoreAllLaunchers = () => {
  getAllLaunchers().forEach(resetLauncher)
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

const isBackgroundExcluded = (element: Element, embed_iframe: HTMLIFrameElement) => {
  if (element === embed_iframe) return true
  return (element as HTMLElement).matches('[data-pierre-open]')
}

const setRecedeBackground = (embed_iframe: HTMLIFrameElement) => {
  recessed_nodes.length = 0
  for (const child of document.body.children) {
    if (isBackgroundExcluded(child, embed_iframe)) continue
    const element = child as HTMLElement
    recessed_style_snapshots.set(element, {
      transform: element.style.transform,
      filter: element.style.filter,
      transformOrigin: element.style.transformOrigin,
      willChange: element.style.willChange
    })
    recessed_nodes.push(element)
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
    const snapshot = recessed_style_snapshots.get(element)
    if (snapshot) {
      element.style.transform = snapshot.transform
      element.style.filter = snapshot.filter
      element.style.transformOrigin = snapshot.transformOrigin
      element.style.willChange = snapshot.willChange
      recessed_style_snapshots.delete(element)
    } else {
      element.style.transform = ''
      element.style.filter = ''
      element.style.transformOrigin = ''
      element.style.willChange = ''
    }
  }
  recessed_nodes.length = 0
}

const runHostOpenAnimations = async (launcher: HTMLElement) => {
  const timing = TIMING.open
  await Promise.all([
    animateRecede('in', timing.scrim, 0),
    waitAnimation(animateLauncherTimeline(launcher, 'in', timing.launcher, timing.launcherDelay))
  ])
  clearRecedeWillChange()
}

const runHostCloseAnimations = async (launcher: HTMLElement) => {
  const timing = TIMING.close
  await Promise.all([
    animateRecede('out', timing.scrim, 0),
    waitAnimation(animateLauncherTimeline(launcher, 'out', timing.launcher, timing.launcherDelay))
  ])
  clearRecedeWillChange()
}

const hapticOpen = () => {
  if (prefers_reduced_motion()) return
  if ('vibrate' in navigator) navigator.vibrate(5)
}

const setInertBackground = (embed_iframe: HTMLIFrameElement) => {
  inerted_nodes.length = 0
  for (const child of document.body.children) {
    if (child === embed_iframe) continue
    const snapshot: InertSnapshot = {
      node: child,
      hadInert: 'inert' in child,
      inertValue: 'inert' in child ? (child as HTMLElement).inert : false,
      hadAriaHidden: child.hasAttribute('aria-hidden'),
      ariaHiddenValue: child.getAttribute('aria-hidden')
    }
    inerted_nodes.push(snapshot)

    if (snapshot.hadInert) (child as HTMLElement).inert = true
    else child.setAttribute('aria-hidden', 'true')
  }
}

const clearInertBackground = () => {
  for (const snapshot of inerted_nodes) {
    if (snapshot.hadInert) {
      ;(snapshot.node as HTMLElement).inert = snapshot.inertValue
    } else if (snapshot.hadAriaHidden) {
      if (snapshot.ariaHiddenValue === null) snapshot.node.setAttribute('aria-hidden', '')
      else snapshot.node.setAttribute('aria-hidden', snapshot.ariaHiddenValue)
    } else {
      snapshot.node.removeAttribute('aria-hidden')
    }
  }
  inerted_nodes.length = 0
}

const lockBodyScroll = () => {
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  scroll_lock_padding = document.body.style.paddingRight
  scroll_lock_overflow = document.body.style.overflow
  overscroll_lock = document.documentElement.style.overscrollBehavior
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overscrollBehavior = 'none'
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
}

const unlockBodyScroll = () => {
  document.body.style.overflow = scroll_lock_overflow
  document.body.style.paddingRight = scroll_lock_padding
  document.documentElement.style.overscrollBehavior = overscroll_lock
}

const ensure_embed_iframe = (url: string, config: string): HTMLIFrameElement => {
  const selector = host_script?.dataset.pierreEmbedTarget ?? `#${EMBED_ID}`
  const existing = document.querySelector<HTMLIFrameElement>(selector)
  if (existing) return existing

  const host = encodeURIComponent(window.location.origin)
  const iframe = document.createElement('iframe')
  iframe.id = EMBED_ID
  iframe.title = 'PIERRE — assistant IA'
  iframe.src = `${url.replace(/\/$/, '')}/embed?config=${encodeURIComponent(config)}&host=${host}`
  iframe.setAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms'
  )
  iframe.style.cssText = embed_iframe_style(false)
  document.body.appendChild(iframe)
  return iframe
}

const init = () => {
  const { url, configuration } = settings()
  if (!url) {
    console.warn(
      '[PIERRE] Impossible de déterminer l’URL du serveur (attribut src manquant sur le <script> ?).'
    )
    return
  }

  const origin = new URL(url).origin
  let iframe: HTMLIFrameElement
  let iframe_ready = false
  let pending_open: { rect: HostRect; launcher: HTMLElement } | null = null
  let active_launcher: HTMLElement | null = null

  const close_embed_layer = () => {
    iframe.style.cssText = embed_iframe_style(false)
    clearInertBackground()
    unlockBodyScroll()
    if (active_launcher && document.contains(active_launcher)) active_launcher.focus()
    active_launcher = null
  }

  const rollback_host_open = () => {
    clearRecedeBackground()
    restoreAllLaunchers()
    close_embed_layer()
    host_close_anim = null
  }

  const finish_host_close = async () => {
    if (host_close_anim) await host_close_anim
    clearRecedeBackground()
    restoreAllLaunchers()
    close_embed_layer()
    host_close_anim = null
  }

  const send_open = (rect: HostRect, launcher: HTMLElement) => {
    active_launcher = launcher
    cacheLauncherBaseTransform(launcher)
    lockBodyScroll()
    setInertBackground(iframe)
    setRecedeBackground(iframe)
    hideInactiveLaunchers(launcher)
    iframe.style.cssText = embed_iframe_style(true)
    hapticOpen()
    void runHostOpenAnimations(launcher)
    iframe.contentWindow?.postMessage({ type: 'pierre:open', rect }, origin)
  }

  const mark_ready = () => {
    if (iframe_ready) return
    iframe_ready = true
    if (pending_open) {
      send_open(pending_open.rect, pending_open.launcher)
      pending_open = null
    }
  }

  iframe = ensure_embed_iframe(url, configuration)

  const isTrustedEmbedMessage = (event: MessageEvent): boolean => {
    const type = event.data?.type
    return (
      event.origin === origin &&
      event.source === iframe.contentWindow &&
      typeof type === 'string' &&
      EMBED_OUTBOUND_TYPES.has(type)
    )
  }

  window.addEventListener('message', (event) => {
    if (!isTrustedEmbedMessage(event)) return

    const type = event.data.type as string
    if (type === 'pierre:ready') mark_ready()
    if (type === 'pierre:open-cancelled') rollback_host_open()
    if (type === 'pierre:closing' && active_launcher) {
      host_close_anim = runHostCloseAnimations(active_launcher)
    }
    if (type === 'pierre:closed') void finish_host_close()
  })

  const probe_embed = () => iframe.contentWindow?.postMessage({ type: 'pierre:probe' }, origin)

  iframe.addEventListener('load', () => probe_embed())

  const open_from = (launcher: HTMLElement) => {
    const rect = launcher.getBoundingClientRect()
    const host_rect: HostRect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right
    }

    if (!iframe_ready) {
      pending_open = { rect: host_rect, launcher }
      probe_embed()
      return
    }

    send_open(host_rect, launcher)
  }

  document.addEventListener('click', (event) => {
    const launcher = (event.target as Element).closest('[data-pierre-open]')
    if (!launcher) return
    event.preventDefault()
    open_from(launcher as HTMLElement)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
