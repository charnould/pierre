import { useLayoutEffect, useMemo, type RefObject } from 'react'

import { markdownToStreamHtml } from '@/shared/lib/markdown-stream-preview'
import { cn } from '@/shared/lib/utils'

export type WorkflowArtifactStreamPreviewProps = {
  content: string
  isStreaming: boolean
  variant?: 'analysis' | 'output'
  scrollRef?: RefObject<HTMLElement | null>
  className?: string
}

export function WorkflowArtifactStreamPreview({
  content,
  isStreaming,
  variant,
  scrollRef,
  className
}: WorkflowArtifactStreamPreviewProps) {
  const html = useMemo(
    () => (isStreaming ? '' : markdownToStreamHtml(content)),
    [content, isStreaming]
  )

  useLayoutEffect(() => {
    const el = scrollRef?.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [content, scrollRef])

  if (!content.trim()) return null

  const streamClass = cn(
    'workflow-artifact-stream whitespace-pre-wrap',
    variant === 'analysis' && 'workflow-artifact-stream--analysis px-4 py-3',
    variant === 'output' && 'workflow-artifact-stream--output llm-answer',
    className
  )

  if (isStreaming) {
    return <div className={streamClass}>{content}</div>
  }

  return <div className={streamClass} dangerouslySetInnerHTML={{ __html: html }} />
}
