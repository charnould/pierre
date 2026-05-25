import type { ChatStatus } from '@/features/chat/hooks/use-chat-session'
import { SIDEBAR_INNER_CLASS } from '@/shared/lib/chrome-shell'
import { cn } from '@/shared/lib/utils'

/** Streamdown hérite du corps Inter (text-sm) ; neutralise le 1rem par défaut de .sd-response. */
export const CHAT_USER_PROSE_CLASS =
  '[&_.sd-response]:m-0 [&_.sd-response]:text-inherit [&_.sd-response]:font-[inherit] [&_.sd-response]:leading-[inherit] [&_.sd-response>*+*]:mt-3'

/** Coque composer — copie exacte de `[data-slot=sidebar-inner"]` (floating). */
export const CHAT_COMPOSER_SURFACE_CLASS = cn('flex flex-col gap-0 p-0', SIDEBAR_INNER_CLASS)

export const CHAT_COMPOSER_INPUT_GROUP_CLASS = cn(
  'h-auto min-h-0 flex-col items-stretch rounded-none border-0 bg-sidebar shadow-none ring-0',
  'has-[[data-slot=input-group-control]:focus-visible]:!border-transparent',
  'has-[[data-slot=input-group-control]:focus-visible]:!shadow-none',
  'has-[[data-slot=input-group-control]:focus-visible]:!ring-0',
  'has-[>textarea]:h-auto'
)

/** Zone de frappe — même fill sidebar, sans styles form field. */
export const CHAT_COMPOSER_TEXTAREA_CLASS = cn(
  'max-h-36 min-h-[3.5rem] w-full resize-none rounded-none border-0 bg-sidebar px-4 pt-3.5 pb-3 text-sm text-sidebar-foreground shadow-none outline-hidden',
  'placeholder:text-muted-foreground',
  'focus-visible:border-transparent focus-visible:bg-sidebar focus-visible:shadow-none',
  'focus-visible:ring-2 focus-visible:ring-sidebar-ring'
)

export const CHAT_COMPOSER_TOOLBAR_CLASS = cn(
  'bg-sidebar flex min-h-7 w-full items-center justify-between gap-1.5 border-t border-border px-3 py-1'
)

/** Profil actif — même traitement que SidebarMenuButton (data-active). */
export const CHAT_COMPOSER_PROFILE_TAB_CLASS = cn(
  'rounded-md outline-hidden transition-colors',
  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
  'data-[state=active]:bg-sidebar-accent data-[state=active]:font-medium data-[state=active]:text-sidebar-accent-foreground data-[state=active]:shadow-none'
)

export const CHAT_COMPOSER_SUBMIT_CLASS = cn(
  'inline-flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 shadow-none outline-hidden transition-colors',
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
  'disabled:opacity-100'
)

export const CHAT_COMPOSER_GENERATING_CLASS =
  'animate-[composer-ring-pulse_2s_ease-in-out_infinite]'

export const CHAT_CONTENT_MAX_W = 'max-w-[42rem]'

export const CHAT_ASSISTANT_CONTENT_CLASS = 'bg-transparent p-0'

/** True while a request is in flight (submit ack or streaming). */
export function isChatGenerating(status: ChatStatus): boolean {
  return status === 'submitted' || status === 'streaming'
}

export function chatComposerSubmitToneClass(active: boolean): string {
  return active ? 'text-sidebar-foreground' : 'cursor-not-allowed text-muted-foreground/45'
}
