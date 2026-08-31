import { useLayoutEffect, useMemo } from 'react'

import { markdownToStreamHtml } from '@/shared/lib/markdown-stream-preview'
import { cn } from '@/shared/lib/utils'

export type WorkflowArtifactStreamPreviewProps = {
  content: string
  isStreaming: boolean
  variant?: 'analysis' | 'output'
  onContentChange?: () => void
  className?: string
}

export function WorkflowArtifactStreamPreview({
  content,
  isStreaming,
  variant,
  onContentChange,
  className
}: WorkflowArtifactStreamPreviewProps) {
  const html = useMemo(
    () => (isStreaming ? '' : markdownToStreamHtml(content)),
    [content, isStreaming]
  )

  useLayoutEffect(() => {
    onContentChange?.()
  }, [content, onContentChange])

  if (!content.trim()) return null

  const streamClass = cn(
    'typeset',
    variant === 'analysis' && 'px-4 py-3 whitespace-pre-wrap',
    variant === 'output' && isStreaming && 'text-pretty whitespace-pre-wrap',
    !variant && 'whitespace-pre-wrap',
    className
  )

  if (isStreaming) {
    return <div className={streamClass}>{content}</div>
  }

  return <div className={streamClass} dangerouslySetInnerHTML={{ __html: html }} />
}
