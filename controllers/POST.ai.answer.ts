import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { Context } from 'hono'
import { stream } from 'hono/streaming'

import { convertToImage } from '../utils/convert-to-image'
import { streamCopilot } from '../utils/copilot-agent'
import { copilotChunkToNdjson, ndjsonLine } from '../utils/stream-to-ndjson'
import { resolveAnswerPrompt } from '../utils/workflow-payload'

const PROJECT_ROOT = resolve(import.meta.dir, '..')

async function loadSkillReasoningDisplay(skillId: string): Promise<'off' | 'partial' | 'full'> {
  const skillsDir = join(PROJECT_ROOT, 'customization', 'skills')
  if (!existsSync(join(skillsDir, skillId, 'config.ts'))) return 'off'
  try {
    const mod = await import(`../customization/skills/${skillId}/config`)
    const display = mod.default?.reasoning_display
    if (display === 'partial' || display === 'full') return display
    return 'off'
  } catch {
    return 'off'
  }
}

/**
 * POST /ai/answer
 *
 * Multipart: conv_id, message, context, skill, payload (optional JSON), files (optional).
 * Streams canonical NDJSON: delta, reasoning_delta, reset, done, error.
 */
export const controller = async (c: Context) => {
  const tempDir = join('/tmp', `pierre-${Bun.randomUUIDv7()}`)

  try {
    const formData = await c.req.formData()
    const conv_id = (formData.get('conv_id') as string | null) ?? Bun.randomUUIDv7()
    const skill = (formData.get('skill') as string | null) ?? 'answer'
    const message = (formData.get('message') as string | null) ?? ''
    const context = (formData.get('context') as string | null) ?? ''
    const payload = (formData.get('payload') as string | null) ?? ''

    const prompt = resolveAnswerPrompt(payload, message, context)

    if (!prompt.trim()) {
      return c.json({ error: 'Empty prompt' }, 400)
    }

    const reasoningDisplay = await loadSkillReasoningDisplay(skill)

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

    c.header('Content-Type', 'application/x-ndjson; charset=utf-8')

    return stream(
      c,
      async (s) => {
        const ac = new AbortController()
        s.onAbort(() => ac.abort())

        const formatState = { needsBullet: true }

        try {
          for await (const chunk of streamCopilot(
            conv_id,
            skill,
            prompt,
            undefined,
            ac.signal,
            attachments
          )) {
            for (const event of copilotChunkToNdjson(chunk, reasoningDisplay, formatState)) {
              await s.write(ndjsonLine(event))
            }
          }
        } finally {
          try {
            rmSync(tempDir, { recursive: true, force: true })
          } catch {}
        }
      },
      async (e, s) => {
        console.error('[POST.AI.ANSWER] Stream error:', e)
        try {
          rmSync(tempDir, { recursive: true, force: true })
        } catch {}
        await s.write(ndjsonLine({ type: 'error' }))
      }
    )
  } catch (e) {
    console.error('[POST.AI.ANSWER] Error:', e)
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {}
    return c.json({ error: 'Generation failed' }, 500)
  }
}
