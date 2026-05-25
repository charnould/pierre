/** Automations — motion & transitions (surfaces → globals.css + desk-*). */

export const AUTO_REPORT_TRANSITION = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1] as const
}

/** Pill de sélection liste — glisse fluide, sans rebond visible */
export const AUTO_LIST_SELECTION_SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 36,
  mass: 0.82
}

/** Contenu liste / détail — accompagne le déplacement de la pill */
export const AUTO_LIST_INK_TRANSITION = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as const
}

/** Survol ligne liste */
export const AUTO_LIST_HOVER_TRANSITION = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1] as const
}

/** Scroll liste — aligné sur la pill de sélection */
export const AUTO_LIST_SCROLL_TRANSITION = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const
}

/** Variants Motion — états idle / sélectionné (liste) */
export const AUTO_LIST_INK_VARIANTS = {
  idle: { opacity: 0.88, y: 1 },
  selected: { opacity: 1, y: 0 }
} as const

export const AUTO_LIST_META_VARIANTS = {
  idle: { opacity: 0.82 },
  selected: { opacity: 1 }
} as const

/** Panneau rapport — fondu léger quand on change d'automatisation */
export const AUTO_DETAIL_CROSSFADE = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const
}
