import { useMemo } from 'react'

import { parseProseMarkdown } from '@/shared/lib/markdown/parse-prose-markdown'

interface Props {
  markdown: string
}

export function UpdateArticleBody({ markdown }: Props) {
  const html = useMemo(() => parseProseMarkdown(markdown), [markdown])

  return (
    <div
      className="typeset text-pretty [--typeset-flow:1em] [--typeset-font-body:var(--font-sans)] [--typeset-font-heading:var(--font-sans)] [--typeset-leading:1.5] [--typeset-size:1em]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
