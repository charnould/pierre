import { cn } from '@/shared/lib/utils'

/** Surface intérieure sidebar floating — source unique (sidebar-inner + composer). */
export const SIDEBAR_INNER_CLASS = cn(
  'bg-sidebar text-sidebar-foreground',
  'rounded-lg border border-border shadow-chrome'
)

/** Surface chrome — fill + texte sidebar. */
export const CHROME_SURFACE_CLASS = 'bg-sidebar text-sidebar-foreground'

/** Shell partagé sidebar + panneau gauche — border shadcn + reflet inset (shadow-chrome). */
export const CHROME_SHELL_CLASS = 'rounded-lg border border-border shadow-chrome'

/** Contrôle chrome — même radius/hover/focus que SidebarMenuButton. */
export const CHROME_CONTROL_CLASS =
  'rounded-md outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50'

export const CHROME_CONTROL_ACTIVE_CLASS =
  'bg-sidebar-accent font-medium text-sidebar-accent-foreground'

/** Coque panneau report — même élévation que chrome, fill via `bg-report`. */
export const REPORT_SHELL_CLASS = CHROME_SHELL_CLASS

export const CHROME_SHELL_FLOATING_SIDEBAR_CLASS =
  'group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-border group-data-[variant=floating]:shadow-chrome'
