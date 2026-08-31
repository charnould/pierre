/** Vertical item content inset — avatar défaut (32) + gouttière 8. Bord gauche = ancre cards 16. */
export const TIMELINE_ITEM_OFFSET_CLASS = 'group-data-[orientation=vertical]/timeline:ms-10'

/**
 * Arrival from the Activity rail: selected `bg-muted` on the whole row (avatar included).
 * Flush to the Inspector body (`px-4` + timeline `px-3` + `ms-10`). Vertical breathing 8 px.
 * No radius, no `px-*`.
 */
export const TIMELINE_HIGHLIGHT_CLASS =
  'isolate before:pointer-events-none before:absolute before:-start-17 before:-end-4 before:-top-2 before:z-0 before:bg-muted before:content-[""] before:animate-inspector-highlight not-last:before:bottom-2 last:before:-bottom-2 [&_[data-slot=timeline-content]]:relative [&_[data-slot=timeline-content]]:z-10 [&_[data-slot=timeline-indicator]]:z-10 [&_[data-slot=timeline-separator]]:z-10'

/** Sibling inset matching item content (day separators, empty states). */
export const TIMELINE_CONTENT_INSET_CLASS = 'ms-10'

/** Separator overrides — rail through the size-8 avatar, left-aligned with card anchors. */
export const TIMELINE_SEPARATOR_CLASS =
  'bg-border/60! group-data-[orientation=vertical]/timeline:top-2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-2rem)] group-data-[orientation=vertical]/timeline:w-px! group-data-[orientation=vertical]/timeline:translate-y-8'

/** Indicator overrides (avatar node). `-left-6` + translate centres a 32 px disc on x=16 (bord gauche à 0). */
export const TIMELINE_INDICATOR_CLASS =
  'size-8 overflow-hidden rounded-full border-none group-data-[orientation=vertical]/timeline:-left-6'
