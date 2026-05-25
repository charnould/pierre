import { PANEL_CONTENT_MAX_W } from '@/features/workflow/components/WorkflowPanelChrome'
import { cn } from '@/shared/lib/utils'

/** Paramètres — colonne centrée, bordures alignées sur le texte. */

export const SETTINGS_SHELL = 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'

/** Padding latéral uniforme depuis le bord du panneau. */
export const SETTINGS_FRAME = 'flex min-h-0 w-full flex-1 flex-col items-center px-6'

export const SETTINGS_COLUMN = cn(
  'flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden',
  PANEL_CONTENT_MAX_W
)

export const SETTINGS_HEADER = cn(
  'flex shrink-0 items-center gap-3 border-b border-border/40 py-3',
  'min-h-10'
)

export const SETTINGS_HEADING = 'text-sm font-semibold leading-5 tracking-[-0.01em] text-foreground'

export const SETTINGS_ACCOUNT_META =
  'text-muted-foreground min-w-0 flex-1 truncate text-xs leading-snug tabular-nums'

export const SETTINGS_MAIN = 'flex min-h-0 flex-1 flex-col overflow-hidden'

export const SETTINGS_BODY = 'flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto py-4'

export const SETTINGS_FIELD_GROUP = 'flex min-h-full flex-col gap-4'

export const SETTINGS_FIELD_STACK = 'flex flex-col gap-2'

export const SETTINGS_FIELD_LABEL = 'text-sm font-medium leading-snug text-foreground'

export const SETTINGS_CAPTION = 'text-xs leading-normal text-wrap text-muted-foreground'

export const SETTINGS_FOOTER =
  'flex min-h-9 w-full shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/40 bg-background/95 py-3 backdrop-blur-sm'

export const LOGIN_PANEL = 'login-panel bg-background'

export const LOGIN_SHELL = 'absolute inset-0 flex items-center justify-center p-6'

export const LOGIN_CARD = 'w-full max-w-sm overflow-y-auto p-8'

export const LOGIN_FIELD_GROUP = 'gap-3.5'

export const LOGIN_FIELD_SET = 'gap-3.5'

export const LOGIN_FIELD_STACK = 'flex flex-col gap-1.5'

export const LOGIN_BRAND_NAME = 'text-foreground text-4xl leading-none font-bold'

export const LOGIN_HEADLINE = 'text-muted-foreground mt-1.5 text-base leading-snug font-light'

export const LOGIN_LEGAL_LABEL =
  'text-muted-foreground min-w-0 flex-1 text-[0.7rem] leading-snug font-normal text-wrap'
