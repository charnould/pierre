export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_IN = [0.4, 0, 1, 1] as const

export const panelScreen = {
  hidden: { opacity: 0, y: 18, transition: { duration: 0.22, ease: EASE_IN } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } }
}
