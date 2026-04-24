import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import type { Context } from 'hono'

import { convertToImage } from '../utils/convert-to-image'
import { streamCopilot } from '../utils/copilot-agent'

/**
 * POST /ai/answer
 *
 * Accepts multipart/form-data from the Electron desktop app:
 *   - conv_id  : conversation identifier
 *   - message  : clipboard content (main context)
 *   - context  : optional additional context
 *   - skill    : skill config id (default: skill_answer)
 *   - files    : uploaded PDF or image files (optional, converted to PNG stripes)
 *
 * Each uploaded file is converted to a single PNG (multi-page PDFs become a vertical stripe).
 * PNGs are attached to the Copilot session for multimodal analysis, then cleaned up.
 */
export const controller = async (c: Context) => {
  const tempDir = join('/tmp', `pierre-${Bun.randomUUIDv7()}`)

  try {
    const formData = await c.req.formData()
    const conv_id = (formData.get('conv_id') as string | null) ?? Bun.randomUUIDv7()
    const skill = (formData.get('skill') as string | null) ?? 'skill_answer'
    const message = (formData.get('message') as string | null) ?? ''
    const context = (formData.get('context') as string | null) ?? ''

    const prompt = context.trim()
      ? `# Message du locataire\n\n${message}\n\n# Contexte additionnel mentionné par le chargé de relation-client\n\n${context}`
      : message

    if (!prompt.trim()) {
      return c.json({ error: 'Empty prompt' }, 400)
    }

    // Convert each uploaded file to a single PNG stripe
    const rawFiles = formData.getAll('files') as File[]
    const attachments: Array<{ type: 'file'; path: string }> = []

    if (rawFiles.length > 0) {
      mkdirSync(tempDir, { recursive: true })

      await Promise.all(
        rawFiles.map(async (file, i) => {
          const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
          const inputPath = join(tempDir, `input-${i}.${ext}`)
          const outputPath = join(tempDir, `output-${i}.png`)

          await Bun.write(inputPath, await file.arrayBuffer())
          await convertToImage(inputPath, outputPath)

          attachments.push({ type: 'file', path: outputPath })
        })
      )
    }

    let fullContent = ''

    for await (const chunk of streamCopilot(
      conv_id,
      skill,
      prompt,
      undefined,
      undefined,
      attachments
    )) {
      if (chunk.type === 'done') {
        fullContent = chunk.fullContent
      }
    }

    return c.json({ content: fullContent })
  } catch (e) {
    console.error('[POST.AI.ANSWER] Error:', e)
    return c.json({ error: 'Generation failed' }, 500)
  } finally {
    // Clean up temp files regardless of success or failure
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }
}
