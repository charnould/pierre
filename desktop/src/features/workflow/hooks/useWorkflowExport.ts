import { useCallback } from 'react'

import { skillHasDocxTemplate } from '@/features/tickets/lib/knowledge-skills'
import {
  generateDocxFilename,
  generateDocxFromTemplate
} from '@/features/workflow/lib/generate-docx'

/**
 * Clipboard copy + Word export for workflow panels.
 * DOCX templates are loaded per skill from the authenticated desktop API.
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
    async (
      body: string,
      skillId: string,
      fields: { subject?: string; adresse?: string; codePostal?: string; ville?: string } = {}
    ): Promise<boolean> => {
      if (!url || !window.api?.getSetupFile) return false
      if (!skillHasDocxTemplate(skillId)) {
        console.error(`[export] No DOCX template for skill: ${skillId}`)
        return false
      }
      const buf = await window.api.getSetupFile({ url, id: 'tickets/letter.docx' })
      if (!buf) {
        console.error(`[export] Failed to load template: ${skillId}`)
        return false
      }
      const bytes = await generateDocxFromTemplate(buf, {
        SUBJECT: fields.subject ?? '',
        BODY: body,
        ADRESSE: fields.adresse ?? '',
        CODE_POSTAL: fields.codePostal ?? '',
        VILLE: fields.ville ?? ''
      })
      const blob = new Blob([new Uint8Array(bytes)], {
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
