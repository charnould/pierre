const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Entrée zone compose. */
const TIMELINE_COMPOSE_ENTER = {
  duration: 0.16,
  ease: EASE_OUT
} as const

/** Sortie plus courte que l’entrée. */
const TIMELINE_COMPOSE_EXIT = {
  duration: 0.12,
  ease: EASE_OUT
} as const

type ComposePresence = {
  initial: { opacity: number; y?: number }
  animate: { opacity: number; y?: number; transition: { duration: number; ease: typeof EASE_OUT } }
  exit: { opacity: number; y?: number; transition: { duration: number; ease: typeof EASE_OUT } }
}

const COMPOSE_PRESENCE_PROPS: ComposePresence = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: TIMELINE_COMPOSE_ENTER },
  exit: { opacity: 0, y: 6, transition: TIMELINE_COMPOSE_EXIT }
}

const COMPOSE_INSERT_PROPS: ComposePresence = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: TIMELINE_COMPOSE_ENTER },
  exit: { opacity: 0, y: 6, transition: TIMELINE_COMPOSE_EXIT }
}

const COMPOSE_REDUCED_PROPS: ComposePresence = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.12, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } }
}

export function composePresenceProps(
  reduceMotion: boolean | null,
  insert = false
): ComposePresence {
  if (reduceMotion) return COMPOSE_REDUCED_PROPS
  return insert ? COMPOSE_INSERT_PROPS : COMPOSE_PRESENCE_PROPS
}
