import type { CSSProperties } from 'react'

import type { Tab } from '@/shared/lib/tabs'
import { cn } from '@/shared/lib/utils'

/** Tokens `--home-tile-*-fill*` définis dans globals.css */
const HOME_TILE_FILL_TOKENS: Partial<Record<Tab, { from: string; fill: string; to: string }>> = {
  chat: {
    from: '--home-tile-chat-fill-from',
    fill: '--home-tile-chat-fill',
    to: '--home-tile-chat-fill-to'
  },
  tickets: {
    from: '--home-tile-tickets-fill-from',
    fill: '--home-tile-tickets-fill',
    to: '--home-tile-tickets-fill-to'
  },
  automations: {
    from: '--home-tile-automations-fill-from',
    fill: '--home-tile-automations-fill',
    to: '--home-tile-automations-fill-to'
  },
  about: {
    from: '--home-tile-about-fill-from',
    fill: '--home-tile-about-fill',
    to: '--home-tile-about-fill-to'
  },
  repayment: {
    from: '--home-tile-repayment-fill-from',
    fill: '--home-tile-repayment-fill',
    to: '--home-tile-repayment-fill-to'
  },
  'insurance-attestation': {
    from: '--home-tile-insurance-attestation-fill-from',
    fill: '--home-tile-insurance-attestation-fill',
    to: '--home-tile-insurance-attestation-fill-to'
  },
  relocation: {
    from: '--home-tile-relocation-fill-from',
    fill: '--home-tile-relocation-fill',
    to: '--home-tile-relocation-fill-to'
  }
}

export function homeTileFillStyle(tab: Tab): CSSProperties {
  const tokens = HOME_TILE_FILL_TOKENS[tab]
  if (!tokens) return {}
  return {
    '--home-tile-fill-from': `var(${tokens.from})`,
    '--home-tile-fill': `var(${tokens.fill})`,
    '--home-tile-fill-to': `var(${tokens.to})`
  } as CSSProperties
}

export const homeGridClassName =
  'grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] auto-rows-[minmax(10.5rem,1fr)] gap-4'

export const homeHeadlineClassName =
  'mb-4 shrink-0 font-serif text-[2.25rem] leading-[1.1] text-foreground font-normal'

export const homeHeadlineSubClassName = 'mt-0.5 block text-[1.625rem] leading-[1.15] font-normal'

const homeTileInteractiveClassName =
  'relative flex min-h-[10.5rem] h-full flex-col items-start justify-between overflow-hidden rounded-2xl p-[1.125rem] text-left motion-reduce:transition-none'

export const homeActionTileClassName = cn(
  homeTileInteractiveClassName,
  'home-action-tile cursor-pointer border-0 text-[var(--home-tile-ink)] hover:shadow-[0_4px_14px_oklch(0_0_0/0.1)] focus-visible:outline-none focus-visible:shadow-[var(--home-tile-chrome-shadow),0_0_0_3px_oklch(from_var(--link)_l_c_h/0.28)]'
)

export const homeInfoTileClassName = cn(
  homeTileInteractiveClassName,
  'h-full cursor-default gap-2 border border-[color-mix(in_oklch,var(--foreground)_8%,transparent)] bg-transparent shadow-none transition-[background-color,box-shadow,border-color] duration-[160ms] hover:border-[color-mix(in_oklch,var(--foreground)_14%,transparent)] hover:bg-[color-mix(in_oklch,var(--foreground)_1.5%,transparent)]'
)

export const homeTileKbdClassName =
  'absolute top-[1.125rem] right-[1.125rem] z-2 h-6 w-6 min-w-6 justify-center rounded-md border border-white/22 bg-white/16 p-0 font-mono text-[0.8125rem] font-medium text-[var(--home-tile-ink-muted)] backdrop-blur-[6px]'

export const homeTileIconClassName =
  'origin-top-left shrink-0 text-[var(--home-tile-ink)] opacity-[0.92] [&_svg]:size-20'

export const homeTileLabelClassName =
  'mt-auto block origin-bottom-left text-[25px] leading-[28px] font-medium text-balance text-[var(--home-tile-ink)]'

export const homeInfoIconClassName =
  'shrink-0 text-[color-mix(in_oklch,var(--foreground)_22%,transparent)] [&_svg]:size-20'

export const homeInfoBodyClassName =
  'text-xs leading-[1.4] font-normal text-desk-caption [&_p]:text-balance [&_p+p]:mt-2'

export const homeInfoFooterClassName = 'mt-auto flex w-full min-w-0 flex-col gap-2'

export const homeInfoVersionClassName =
  'shrink-0 font-mono text-[0.6875rem] leading-none text-desk-caption'

export const homeInfoLinkClassName =
  'inline cursor-pointer border-0 bg-transparent p-0 text-left font-inherit text-inherit underline decoration-[color-mix(in_oklch,currentColor_35%,transparent)] underline-offset-[0.12em] transition-[color,text-decoration-color] duration-150 hover:text-link hover:decoration-[color-mix(in_oklch,var(--link)_55%,transparent)]'
