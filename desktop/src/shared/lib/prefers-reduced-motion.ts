export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function scrollBehavior(smooth = true): ScrollBehavior {
  if (!smooth || prefersReducedMotion()) return 'auto'
  return 'smooth'
}
