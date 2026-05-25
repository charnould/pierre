import { useCallback } from 'react'

import { skillHasDocxTemplate } from '@/features/tickets/lib/knowledge-skills'
import {
  generateDocxFilename,
  generateDocxFromTemplate
} from '@/features/workflow/lib/generate-docx'

export function skillDocxTemplateUrl(baseUrl: string, skillId: string): string {
  return `${baseUrl}/customization/skills/${skillId}/template.docx`
}

/**
 * Clipboard copy + Word export for workflow panels.
 * DOCX templates are loaded per skill from `customization/skills/<skillId>/template.docx`.
 */
export function useWorkflowExport(url: string | undefined) {
  const copyText = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await window.api.writeClipboard(text)
    } catch (err) {
      console.error('[copy] Failed to write clipboard:', err)
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }, [])

  const downloadDocx = useCallback(
    async (body: string, skillId: string, subject = ''): Promise<boolean> => {
      if (!url) return false
      if (!skillHasDocxTemplate(skillId)) {
        console.error(`[export] No DOCX template for skill: ${skillId}`)
        return false
      }
      const resp = await fetch(skillDocxTemplateUrl(url, skillId))
      if (!resp.ok) {
        console.error(`[export] Failed to load template (${resp.status}): ${skillId}`)
        return false
      }
      const buf = await resp.arrayBuffer()
      const bytes = await generateDocxFromTemplate(buf, { subject, body })
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${generateDocxFilename()}.docx`
      a.click()
      URL.revokeObjectURL(a.href)
      return true
    },
    [url]
  )

  return { copyText, downloadDocx }
}
