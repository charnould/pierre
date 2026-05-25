import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { Streamdown } from 'streamdown'

import { cn } from '@/shared/lib/utils'

const streamdownPlugins = { cjk, code, math, mermaid }

const updateArticleClassName = cn(
  'size-full text-sm',
  '[&_.sd-response]:text-sm [&_.sd-response]:leading-normal',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
)

interface Props {
  markdown: string
}

export function UpdateArticleBody({ markdown }: Props) {
  return (
    <Streamdown isAnimating={false} plugins={streamdownPlugins} className={updateArticleClassName}>
      {markdown}
    </Streamdown>
  )
}
