import { useMemo } from 'react'

import { parseAutoReportMarkdown } from '@/features/automations/lib/parse-auto-report-markdown'

import '@/features/automations/styles/auto-report-markdown.css'

interface MarkdownReportProps {
  content: string
}

export function MarkdownReport({ content }: MarkdownReportProps) {
  const html = useMemo(() => parseAutoReportMarkdown(content), [content])

  return <article className="auto-report-markdown" dangerouslySetInnerHTML={{ __html: html }} />
}
