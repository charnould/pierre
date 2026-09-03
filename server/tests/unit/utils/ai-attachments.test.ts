import { describe, expect, it } from 'bun:test'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import {
  activeAttachmentStagingLocks,
  assertAttachmentLimits,
  cleanupConversationUploads,
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  processUploadedAttachments
} from '../../../utils/ai-attachments'
import {
  conversationReservationCount,
  destroyVm,
  reserveConversation
} from '../../../utils/vm-registry'

const STAGED_INSTRUCTION =
  'Les fichiers suivants sont dans ton répertoire de travail (/knowledge) et restent disponibles pour toute la conversation. Pour les analyser : utilise `read` pour les images ; pour tout autre document joint, exécute `document-extract <chemin>` via bash (ex. `document-extract _uploads/…/facture.pdf`).'

const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'

async function createTempDir(prefix: string): Promise<string> {
  const process = Bun.spawn(['mktemp', '-d', `${Bun.env['TMPDIR'] ?? '/tmp'}/${prefix}XXXXXX`], {
    stdout: 'pipe',
    stderr: 'pipe'
  })
  if ((await process.exited) !== 0) {
    throw new Error(await new Response(process.stderr).text())
  }
  return (await new Response(process.stdout).text()).trim()
}

async function removePath(path: string): Promise<void> {
  await Bun.spawn(['rm', '-rf', path]).exited
}

describe('processUploadedAttachments', () => {
  it('inlines text files in the prompt', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const file = new File(['ligne de test'], 'note.txt', { type: 'text/plain' })
      const result = await processUploadedAttachments(
        [file],
        knowledgePath,
        'Que dit le fichier ?',
        CONV_ID
      )

      expect(result.images).toHaveLength(0)
      expect(result.content).toContain('Que dit le fichier ?')
      expect(result.content).toContain('ligne de test')
      expect(result.uploadId).toBe(CONV_ID)
      expect(await Bun.file(join(knowledgePath, CONV_ID, 'note.txt')).exists()).toBe(true)
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('inlines json and csv in the prompt', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const json = new File(['{"a":1}'], 'data.json', { type: 'application/json' })
      const csv = new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' })
      const result = await processUploadedAttachments([json, csv], knowledgePath, '', CONV_ID)

      expect(result.content).toContain('{"a":1}')
      expect(result.content).toContain('a,b')
      expect(result.content).not.toContain('document-extract')
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('passes raster images through as base64 without staging instruction', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const bytes = Uint8Array.fromBase64(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      )
      const file = new File([bytes], 'pixel.png', { type: 'image/png' })

      const result = await processUploadedAttachments([file], knowledgePath, '', CONV_ID)

      expect(result.images).toHaveLength(1)
      expect(result.images[0]?.mimeType).toBe('image/png')
      expect(result.images[0]?.data.length).toBeGreaterThan(20)
      expect(result.content).toContain('Analyse les pièces jointes')
      expect(result.content).toContain(`<file name="_uploads/${CONV_ID}/`)
      expect(result.content).toContain('pixel.png"></file>')
      expect(result.content).not.toContain('document-extract')
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('stages PDF files for document-extract with generic instruction', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const file = new File(['%PDF-1.4 fake'], 'facture.pdf', { type: 'application/pdf' })
      const result = await processUploadedAttachments(
        [file],
        knowledgePath,
        'Analyse ce PDF',
        CONV_ID
      )

      expect(result.images).toHaveLength(0)
      expect(result.content).toContain('Analyse ce PDF')
      expect(result.content).toContain(STAGED_INSTRUCTION)
      expect(result.content).toContain('facture.pdf"></file>')
      expect(await Bun.file(join(knowledgePath, CONV_ID, 'facture.pdf')).exists()).toBe(true)
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('stages pptx files for document-extract', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const file = new File(['PK fake pptx'], 'slides.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      })
      const result = await processUploadedAttachments([file], knowledgePath, 'Résume', CONV_ID)

      expect(result.images).toHaveLength(0)
      expect(result.content).toContain(STAGED_INSTRUCTION)
      expect(result.content).toContain('slides.pptx"></file>')
      expect(await Bun.file(join(knowledgePath, CONV_ID, 'slides.pptx')).exists()).toBe(true)
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('stages Excel files (.xls, .xlsm, .xlsb) for document-extract', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const xls = new File(['fake xls'], 'budget.xls', { type: 'application/vnd.ms-excel' })
      const xlsm = new File(['PK fake xlsm'], 'budget.xlsm', {
        type: 'application/vnd.ms-excel.sheet.macroEnabled.12'
      })
      const xlsb = new File(['PK fake xlsb'], 'budget.xlsb', {
        type: 'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
      })
      const result = await processUploadedAttachments(
        [xls, xlsm, xlsb],
        knowledgePath,
        'Analyse',
        CONV_ID
      )

      expect(result.images).toHaveLength(0)
      expect(result.content).toContain(STAGED_INSTRUCTION)
      expect(result.content).toContain('budget.xls"></file>')
      expect(result.content).toContain('budget.xlsm"></file>')
      expect(result.content).toContain('budget.xlsb"></file>')
      expect(await Bun.file(join(knowledgePath, CONV_ID, 'budget.xls')).exists()).toBe(true)
      expect(await Bun.file(join(knowledgePath, CONV_ID, 'budget.xlsm')).exists()).toBe(true)
      expect(await Bun.file(join(knowledgePath, CONV_ID, 'budget.xlsb')).exists()).toBe(true)
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('rejects unsupported iWork files without staging', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const file = new File(['PK fake pages'], 'rapport.pages', {
        type: 'application/vnd.apple.pages'
      })

      await expect(
        processUploadedAttachments([file], knowledgePath, 'Résume', CONV_ID)
      ).rejects.toThrow("Le format .pages n'est pas pris en charge.")

      expect(await Bun.file(join(knowledgePath, CONV_ID)).exists()).toBe(false)
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('keeps staged files available on follow-up turns without re-upload', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const file = new File(['%PDF-1.4 fake'], 'facture.pdf', { type: 'application/pdf' })
      await processUploadedAttachments([file], knowledgePath, 'Analyse ce PDF', CONV_ID)

      const followUp = await processUploadedAttachments(
        [],
        knowledgePath,
        'Et la page 2 ?',
        CONV_ID
      )

      expect(followUp.content).toContain('Et la page 2 ?')
      expect(followUp.content).toContain(STAGED_INSTRUCTION)
      expect(followUp.content).toContain(`<file name="_uploads/${CONV_ID}/facture.pdf"></file>`)
      expect(await Bun.file(join(knowledgePath, CONV_ID, 'facture.pdf')).exists()).toBe(true)
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('reuses exact retried uploads without consuming conversation quota twice', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    const files = Array.from(
      { length: MAX_ATTACHMENT_FILES },
      (_, index) => new File([`content-${index}`], `document-${index}.txt`)
    )
    try {
      const initial = await processUploadedAttachments(files, knowledgePath, 'Analyse', CONV_ID)
      initial.claim()
      const retry = await processUploadedAttachments(files, knowledgePath, 'Réessaie', CONV_ID)
      retry.claim()

      expect(initial.usage).toEqual(retry.usage)
      expect(retry.usage?.files).toBe(MAX_ATTACHMENT_FILES)
      expect(readdirSync(join(knowledgePath, CONV_ID))).toHaveLength(MAX_ATTACHMENT_FILES)
      expect(retry.content).toContain('Réessaie')
      expect(retry.content).toContain('content-0')
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('cleanupConversationUploads removes the conversation staging directory', async () => {
    const knowledgePath = await createTempDir('pierre-knowledge-')
    try {
      const file = new File(['%PDF-1.4 fake'], 'facture.pdf', { type: 'application/pdf' })
      await processUploadedAttachments([file], knowledgePath, 'Analyse', CONV_ID)

      await cleanupConversationUploads(knowledgePath, CONV_ID)

      expect(await Bun.file(join(knowledgePath, CONV_ID)).exists()).toBe(false)
    } finally {
      await removePath(knowledgePath)
    }
  })

  it('rejects traversal conversation IDs before writing outside the upload root', async () => {
    const uploadRoot = await createTempDir('pierre-uploads-')
    const outsidePath = join(uploadRoot, '..', `pierre-traversal-${Bun.randomUUIDv7()}.txt`)
    try {
      const file = new File(['attacker data'], 'escape.txt', { type: 'text/plain' })

      await expect(
        processUploadedAttachments([file], uploadRoot, 'test', '../outside')
      ).rejects.toThrow('conv_id must be a canonical UUID')

      expect(await Bun.file(outsidePath).exists()).toBe(false)
    } finally {
      await removePath(uploadRoot)
      await removePath(outsidePath)
    }
  })

  it('rejects traversal conversation IDs without deleting outside the upload root', async () => {
    const uploadRoot = await createTempDir('pierre-uploads-')
    const victimDir = join(uploadRoot, '..', `pierre-victim-${Bun.randomUUIDv7()}`)
    const victimPath = join(victimDir, 'keep.txt')
    try {
      expect(await Bun.spawn(['mkdir', '-p', victimDir]).exited).toBe(0)
      await Bun.write(victimPath, 'keep')

      await expect(
        cleanupConversationUploads(uploadRoot, `../${victimDir.split('/').pop()}`)
      ).rejects.toThrow('conv_id must be a canonical UUID')
      expect(await Bun.file(victimPath).exists()).toBe(true)
    } finally {
      await removePath(uploadRoot)
      await removePath(victimDir)
    }
  })

  it('rejects per-file and aggregate byte limit violations before writing', () => {
    const oversized = new File([new Uint8Array(MAX_ATTACHMENT_FILE_BYTES + 1)], 'large.pdf', {
      type: 'application/pdf'
    })
    expect(() => assertAttachmentLimits([oversized])).toThrow(
      `Each file must be at most ${MAX_ATTACHMENT_FILE_BYTES} bytes`
    )

    const partSize = Math.floor(MAX_ATTACHMENT_TOTAL_BYTES / 3) + 1
    const parts = Array.from(
      { length: 3 },
      (_, index) =>
        new File([new Uint8Array(partSize)], `${index}.pdf`, { type: 'application/pdf' })
    )
    expect(() => assertAttachmentLimits(parts)).toThrow(
      `Attachments must total at most ${MAX_ATTACHMENT_TOTAL_BYTES} bytes`
    )
  })

  it('serializes concurrent staging and atomically assigns unique names', async () => {
    const uploadRoot = await createTempDir('pierre-uploads-')
    try {
      const [first, second] = await Promise.all([
        processUploadedAttachments(
          [new File(['first'], 'same.txt', { type: 'text/plain' })],
          uploadRoot,
          'first',
          CONV_ID
        ),
        processUploadedAttachments(
          [new File(['second'], 'same.txt', { type: 'text/plain' })],
          uploadRoot,
          'second',
          CONV_ID
        )
      ])

      expect(await Bun.file(join(uploadRoot, CONV_ID, 'same.txt')).exists()).toBe(true)
      expect(await Bun.file(join(uploadRoot, CONV_ID, 'same-2.txt')).exists()).toBe(true)
      expect(activeAttachmentStagingLocks()).toBe(0)
      first.claim()
      second.claim()
    } finally {
      await removePath(uploadRoot)
    }
  })

  it('enforces cumulative count and byte quotas under concurrent requests', async () => {
    const uploadRoot = await createTempDir('pierre-uploads-')
    const stagingDir = join(uploadRoot, CONV_ID)
    try {
      expect(await Bun.spawn(['mkdir', '-p', stagingDir]).exited).toBe(0)
      for (let index = 0; index < MAX_ATTACHMENT_FILES - 1; index++) {
        await Bun.write(join(stagingDir, `existing-${index}.txt`), 'x')
      }

      const results = await Promise.allSettled([
        processUploadedAttachments(
          [new File(['a'], 'new.txt', { type: 'text/plain' })],
          uploadRoot,
          'a',
          CONV_ID
        ),
        processUploadedAttachments(
          [new File(['b'], 'new.txt', { type: 'text/plain' })],
          uploadRoot,
          'b',
          CONV_ID
        )
      ])
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
      expect(activeAttachmentStagingLocks()).toBe(0)

      await removePath(stagingDir)
      expect(await Bun.spawn(['mkdir', '-p', stagingDir]).exited).toBe(0)
      expect(
        await Bun.spawn([
          'truncate',
          '-s',
          String(MAX_ATTACHMENT_TOTAL_BYTES),
          join(stagingDir, 'existing.pdf')
        ]).exited
      ).toBe(0)
      await expect(
        processUploadedAttachments(
          [new File(['x'], 'extra.txt', { type: 'text/plain' })],
          uploadRoot,
          'extra',
          CONV_ID
        )
      ).rejects.toThrow(`Attachments must total at most ${MAX_ATTACHMENT_TOTAL_BYTES} bytes`)
      expect(await Bun.file(join(stagingDir, 'extra.txt')).exists()).toBe(false)
      expect(activeAttachmentStagingLocks()).toBe(0)
    } finally {
      await removePath(uploadRoot)
    }
  })

  it('rolls back only files from the failed pre-VM request', async () => {
    const uploadRoot = await createTempDir('pierre-uploads-')
    try {
      const existing = await processUploadedAttachments(
        [new File(['keep'], 'existing.txt', { type: 'text/plain' })],
        uploadRoot,
        'existing',
        CONV_ID
      )
      existing.claim()

      const pending = await processUploadedAttachments(
        [new File(['remove'], 'pending.txt', { type: 'text/plain' })],
        uploadRoot,
        'pending',
        CONV_ID
      )
      await pending.rollback()

      expect(await Bun.file(join(uploadRoot, CONV_ID, 'existing.txt')).text()).toBe('keep')
      expect(await Bun.file(join(uploadRoot, CONV_ID, 'pending.txt')).exists()).toBe(false)
      expect(activeAttachmentStagingLocks()).toBe(0)
    } finally {
      await removePath(uploadRoot)
    }
  })

  it('keeps an unregistered conversation path stable during concurrent destruction', async () => {
    const uploadRoot = await createTempDir('pierre-uploads-')
    const releaseReservation = reserveConversation(CONV_ID)
    const releaseNestedReservation = reserveConversation(CONV_ID)
    try {
      const pending = await processUploadedAttachments(
        [new File(['pending'], 'pending.txt', { type: 'text/plain' })],
        uploadRoot,
        'pending',
        CONV_ID
      )
      const stagingPath = join(uploadRoot, CONV_ID)
      const inodeBefore = (await Bun.file(stagingPath).stat()).ino

      await new Promise<void>((resolve) => {
        setTimeout(() => void destroyVm(CONV_ID).then(resolve), 0)
      })

      expect(conversationReservationCount(CONV_ID)).toBe(2)
      expect(await Bun.file(join(stagingPath, 'pending.txt')).text()).toBe('pending')
      expect((await Bun.file(stagingPath).stat()).ino).toBe(inodeBefore)

      releaseNestedReservation()
      expect(conversationReservationCount(CONV_ID)).toBe(1)
      expect((await Bun.file(stagingPath).stat()).ino).toBe(inodeBefore)
      releaseReservation()
      expect(conversationReservationCount(CONV_ID)).toBe(0)
      expect((await Bun.file(stagingPath).stat()).ino).toBe(inodeBefore)
      await pending.rollback()
    } finally {
      releaseNestedReservation()
      releaseReservation()
      await removePath(uploadRoot)
    }
  })

  it('removes files partially staged when attachment processing fails', async () => {
    class FailingFile extends File {
      override async arrayBuffer(): Promise<ArrayBuffer> {
        throw new Error('simulated read failure')
      }
    }

    const uploadRoot = await createTempDir('pierre-uploads-')
    try {
      const first = new File(['written'], 'first.txt', { type: 'text/plain' })
      const second = new FailingFile(['unreadable'], 'second.txt', { type: 'text/plain' })

      await expect(
        processUploadedAttachments([first, second], uploadRoot, 'test', CONV_ID)
      ).rejects.toThrow('simulated read failure')
      expect(await Bun.file(join(uploadRoot, CONV_ID)).exists()).toBe(false)
    } finally {
      await removePath(uploadRoot)
    }
  })
})
