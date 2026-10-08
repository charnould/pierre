import { useMemo } from 'react'

import { parseProseMarkdown } from '@/shared/lib/markdown/parse-prose-markdown'

interface Props {
  markdown: string
}

export function UpdateArticleBody({ markdown }: Props) {
  const html = useMemo(() => parseProseMarkdown(markdown), [markdown])

  return (
    <div className="typeset typeset-reply text-pretty" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
