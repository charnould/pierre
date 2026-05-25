import { useCallback } from 'react'

import { generateDocxFilename, generateDocxFromTemplate } from '../lib/generate-docx'

/**
 * Clipboard copy + Word export for workflow panels (Answer, Synthèse).
 * Uses the shared answer skill template on the Pierre server.
 */
export function useWorkflowExport(url: string | undefined) {
  const copyText = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    await window.api.writeClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }, [])

  const downloadDocx = useCallback(
    async (text: string) => {
      if (!url) return
      const resp = await fetch(`${url}/customization/skills/answer/template.docx`)
      if (!resp.ok) return
      const buf = await resp.arrayBuffer()
      const bytes = await generateDocxFromTemplate(buf, text)
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${generateDocxFilename()}.docx`
      a.click()
      URL.revokeObjectURL(a.href)
    },
    [url]
  )

  return { copyText, downloadDocx }
}
