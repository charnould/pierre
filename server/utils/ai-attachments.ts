import { existsSync, mkdirSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'

import {
  ATTACHMENT_IMAGE_EXTENSIONS,
  ATTACHMENT_TEXT_EXTENSIONS,
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  isSupportedAttachment,
  needsDocumentExtract,
  unsupportedAttachmentDescription
} from '../../shared/attachment-extensions'

export {
  MAX_ATTACHMENT_FILES,
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES
} from '../../shared/attachment-extensions'

/** Pi RPC `ImageContent` — see pi-coding-agent docs/rpc.md */
export type PiImageContent = {
  type: 'image'
  data: string
  mimeType: string
}

export type ProcessedPiAttachments = {
  images: PiImageContent[]
  content: string
  /** Conversation id used as the staging directory name under `_uploads/`. */
  uploadId: string | null
  /** Authoritative conversation quota after this request. */
  usage?: { files: number; bytes: number }
  /** Transfers ownership of newly staged files to the conversation VM. */
  claim(): void
  /** Removes only files written by this request until ownership is claimed. */
  rollback(): Promise<void>
}

const DEFAULT_ATTACHMENT_PROMPT =
  'Analyse les pièces jointes fournies et réponds en français en t’appuyant sur leur contenu.'

const STAGED_FILES_INSTRUCTION =
  'Les fichiers suivants sont dans ton répertoire de travail (/knowledge) et restent disponibles pour toute la conversation. Pour les analyser : utilise `read` pour les images ; pour tout autre document joint, exécute `document-extract <chemin>` via bash (ex. `document-extract _uploads/…/facture.pdf`).'

const MAX_INLINE_IMAGE_BYTES = 4.5 * 1024 * 1024

export const MAX_MULTIPART_REQUEST_BYTES = 22 * 1024 * 1024

const stagingLocks = new Map<string, Promise<void>>()

const CANONICAL_CONVERSATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export class AttachmentRequestError extends Error {
  constructor(
    readonly code:
      | 'invalid_conversation_id'
      | 'invalid_multipart'
      | 'too_many_files'
      | 'file_too_large'
      | 'attachments_too_large'
      | 'unsupported_attachment'
      | 'attachments_disabled',
    message: string,
    readonly status: 400 | 403 | 413 = 400
  ) {
    super(message)
    this.name = 'AttachmentRequestError'
  }
}

export function assertCanonicalConversationId(value: string): string {
  if (!CANONICAL_CONVERSATION_ID.test(value)) {
    throw new AttachmentRequestError(
      'invalid_conversation_id',
      'conv_id must be a canonical UUID',
      400
    )
  }
  return value
}

export function assertMultipartRequestSize(contentLength: string | undefined): void {
  if (contentLength === undefined) return
  const bytes = Number(contentLength)
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw new AttachmentRequestError('invalid_multipart', 'Invalid Content-Length', 400)
  }
  if (bytes > MAX_MULTIPART_REQUEST_BYTES) {
    throw new AttachmentRequestError('attachments_too_large', 'Multipart request is too large', 413)
  }
}

export function assertAttachmentLimits(
  files: File[],
  existing: { files: number; bytes: number } = { files: 0, bytes: 0 }
): void {
  if (existing.files + files.length > MAX_ATTACHMENT_FILES) {
    throw new AttachmentRequestError(
      'too_many_files',
      `At most ${MAX_ATTACHMENT_FILES} files are allowed`,
      413
    )
  }

  let totalBytes = existing.bytes
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_FILE_BYTES) {
      throw new AttachmentRequestError(
        'file_too_large',
        `Each file must be at most ${MAX_ATTACHMENT_FILE_BYTES} bytes`,
        413
      )
    }
    totalBytes += file.size
    if (totalBytes > MAX_ATTACHMENT_TOTAL_BYTES) {
      throw new AttachmentRequestError(
        'attachments_too_large',
        `Attachments must total at most ${MAX_ATTACHMENT_TOTAL_BYTES} bytes`,
        413
      )
    }
  }
}

async function withStagingLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = stagingLocks.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolveLock) => {
    release = resolveLock
  })
  stagingLocks.set(key, current)
  await previous
  try {
    return await operation()
  } finally {
    release()
    if (stagingLocks.get(key) === current) stagingLocks.delete(key)
  }
}

export function activeAttachmentStagingLocks(): number {
  return stagingLocks.size
}

export function bindAttachmentReservation(
  attachments: ProcessedPiAttachments,
  releaseReservation: () => void
): ProcessedPiAttachments {
  let released = false
  const release = () => {
    if (released) return
    released = true
    releaseReservation()
  }
  return {
    ...attachments,
    claim() {
      attachments.claim()
      release()
    },
    async rollback() {
      try {
        await attachments.rollback()
      } finally {
        release()
      }
    }
  }
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'file'
  const cleaned = base.replace(/[^\w.\-() ]+/g, '_').trim()
  return cleaned.replace(/^\.+/, '_').slice(0, 200) || 'file'
}

function resolveImageMime(file: File, ext: string): string {
  if (file.type.startsWith('image/')) return file.type
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? 'bin'
}

function assertSupportedAttachments(rawFiles: File[]): void {
  const rejected = rawFiles.filter((file) => !isSupportedAttachment(file))
  if (rejected.length === 0) return
  throw new AttachmentRequestError(
    'unsupported_attachment',
    rejected.map((file) => unsupportedAttachmentDescription(file.name)).join(' ')
  )
}

function containedPath(root: string, ...segments: string[]): string {
  const canonicalRoot = resolve(root)
  const candidate = resolve(canonicalRoot, ...segments)
  const rel = relative(canonicalRoot, candidate)
  if (rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))) {
    return candidate
  }
  throw new AttachmentRequestError('invalid_conversation_id', 'Upload path escapes its root')
}

function conversationStagingDir(uploadRoot: string, convId: string): string {
  return containedPath(uploadRoot, assertCanonicalConversationId(convId))
}

function uniqueStagedName(stagingDir: string, requestedName: string): string {
  if (!existsSync(containedPath(stagingDir, requestedName))) return requestedName
  const extension = extname(requestedName)
  const stem = requestedName.slice(0, requestedName.length - extension.length)
  let suffix = 2
  while (existsSync(containedPath(stagingDir, `${stem}-${suffix}${extension}`))) suffix++
  return `${stem}-${suffix}${extension}`
}

function isStagedVersion(name: string, requestedName: string): boolean {
  if (name === requestedName) return true
  const extension = extname(requestedName)
  const stem = requestedName.slice(0, requestedName.length - extension.length)
  if (!name.startsWith(`${stem}-`) || !name.endsWith(extension)) return false
  const suffix = name.slice(stem.length + 1, name.length - extension.length)
  return /^\d+$/.test(suffix)
}

function attachmentDigest(buffer: ArrayBuffer): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(new Uint8Array(buffer))
  return hasher.digest('hex')
}

async function matchingStagedName(
  stagingDir: string,
  requestedName: string,
  size: number,
  digest: string,
  digestCache: Map<string, string>
): Promise<string | null> {
  const names = existsSync(stagingDir)
    ? readdirSync(stagingDir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    : []
  for (const name of names) {
    if (!isStagedVersion(name, requestedName)) continue
    const path = containedPath(stagingDir, name)
    const existing = Bun.file(path)
    if ((await existing.stat()).size !== size) continue
    let existingDigest = digestCache.get(name)
    if (!existingDigest) {
      existingDigest = attachmentDigest(await existing.arrayBuffer())
      digestCache.set(name, existingDigest)
    }
    if (existingDigest === digest) return name
  }
  return null
}

function listConversationUploads(uploadRoot: string, convId: string): string[] {
  const dir = conversationStagingDir(uploadRoot, convId)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
}

async function existingAttachmentUsage(
  uploadRoot: string,
  convId: string
): Promise<{ files: number; bytes: number }> {
  const stagingDir = conversationStagingDir(uploadRoot, convId)
  const names = listConversationUploads(uploadRoot, convId)
  let bytes = 0
  for (const name of names) {
    bytes += (await Bun.file(containedPath(stagingDir, name)).stat()).size
  }
  return { files: names.length, bytes }
}

async function resizeRasterWithImageMagick(inputPath: string, outputPath: string): Promise<void> {
  const proc = Bun.spawn(
    ['convert', inputPath, '-resize', '2000x2000>', '-quality', '85', outputPath],
    { stderr: 'pipe' }
  )

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const errText = await new Response(proc.stderr).text()
    throw new Error(`ImageMagick resize failed (exit ${exitCode}): ${errText}`)
  }
}

async function readImageForPi(inputPath: string, file: File, ext: string): Promise<PiImageContent> {
  let pathToRead = inputPath
  let mimeType = resolveImageMime(file, ext)
  let resizedPath: string | null = null

  const size = (await Bun.file(inputPath).stat()).size
  if (size > MAX_INLINE_IMAGE_BYTES) {
    resizedPath = `${inputPath}.resized.jpg`
    await resizeRasterWithImageMagick(inputPath, resizedPath)
    pathToRead = resizedPath
    mimeType = 'image/jpeg'
  }

  try {
    const bytes = new Uint8Array(await Bun.file(pathToRead).arrayBuffer())
    return {
      type: 'image',
      data: bytes.toBase64(),
      mimeType
    }
  } finally {
    if (resizedPath) {
      try {
        unlinkSync(resizedPath)
      } catch {}
    }
  }
}

function buildAttachmentPrompt(
  userMessage: string,
  fileBlocks: string[],
  hasStagedDocuments: boolean
): string {
  const trimmed = userMessage.trim()
  const intro = trimmed || (fileBlocks.length > 0 ? DEFAULT_ATTACHMENT_PROMPT : '')

  const parts: string[] = []
  if (intro) parts.push(intro)
  if (hasStagedDocuments) parts.push(STAGED_FILES_INSTRUCTION)
  if (fileBlocks.length > 0) parts.push(fileBlocks.join('\n'))

  return parts.join('\n\n')
}

function buildExistingUploadsPrompt(
  uploadRoot: string,
  convId: string,
  userMessage: string
): ProcessedPiAttachments | null {
  const convKey = assertCanonicalConversationId(convId)
  const staged = listConversationUploads(uploadRoot, convKey)
  if (staged.length === 0) return null

  const fileBlocks = staged.map((name) => `<file name="_uploads/${convKey}/${name}"></file>`)
  const hasStagedDocuments = staged.some((name) => needsDocumentExtract(name))

  return {
    images: [],
    content: buildAttachmentPrompt(userMessage, fileBlocks, hasStagedDocuments),
    uploadId: convKey,
    claim() {},
    async rollback() {}
  }
}

function emptyProcessedAttachments(content: string): ProcessedPiAttachments {
  return {
    images: [],
    content,
    uploadId: null,
    claim() {},
    async rollback() {}
  }
}

/**
 * Prepares uploaded files for Pi RPC:
 * - raster images (png/jpeg/gif/webp) → `images` (base64, Pi vision format)
 * - text files → inlined in the prompt (`<file>…</file>`)
 * - PDF / Office → staged under `knowledge/_uploads/<conv_id>/` for Pi tools
 *
 * Files persist for the lifetime of the conversation VM and are removed when the VM is released.
 */
export async function processUploadedAttachments(
  rawFiles: File[],
  uploadRoot: string,
  userMessage: string,
  convId?: string
): Promise<ProcessedPiAttachments> {
  const convKey = convId ? assertCanonicalConversationId(convId) : null

  if (rawFiles.length === 0) {
    if (convKey) {
      const stagingDir = conversationStagingDir(uploadRoot, convKey)
      return withStagingLock(stagingDir, async () => {
        const existing = buildExistingUploadsPrompt(uploadRoot, convKey, userMessage)
        return existing ?? emptyProcessedAttachments(userMessage)
      })
    }
    return emptyProcessedAttachments(userMessage)
  }

  assertAttachmentLimits(rawFiles)
  assertSupportedAttachments(rawFiles)

  const stagingKey = convKey ?? Bun.randomUUIDv7()
  const stagingDir = conversationStagingDir(uploadRoot, stagingKey)
  return withStagingLock(stagingDir, async () => {
    const stagingDirExisted = existsSync(stagingDir)
    const digestCache = new Map<string, string>()
    const preparedFiles = []
    for (const file of rawFiles) {
      const requestedName = sanitizeFilename(file.name)
      const buffer = await file.arrayBuffer()
      const digest = attachmentDigest(buffer)
      preparedFiles.push({
        file,
        buffer,
        requestedName,
        existingName: await matchingStagedName(
          stagingDir,
          requestedName,
          file.size,
          digest,
          digestCache
        )
      })
    }
    const existingUsage = await existingAttachmentUsage(uploadRoot, stagingKey)
    const newFiles = preparedFiles
      .filter(({ existingName }) => !existingName)
      .map(({ file }) => file)
    assertAttachmentLimits(newFiles, existingUsage)
    const usage = {
      files: existingUsage.files + newFiles.length,
      bytes: existingUsage.bytes + newFiles.reduce((total, file) => total + file.size, 0)
    }
    mkdirSync(stagingDir, { recursive: true })

    const images: PiImageContent[] = []
    const fileBlocks: string[] = []
    const writtenPaths: string[] = []
    let hasStagedDocuments = false

    const removeWrittenFiles = () => {
      for (const path of writtenPaths) {
        try {
          unlinkSync(path)
        } catch {}
        try {
          unlinkSync(`${path}.resized.jpg`)
        } catch {}
      }
      if (!stagingDirExisted && existsSync(stagingDir) && readdirSync(stagingDir).length === 0) {
        try {
          rmSync(stagingDir, { recursive: true, force: true })
        } catch {}
      }
    }

    try {
      for (const { file, buffer, requestedName, existingName } of preparedFiles) {
        const safeName = existingName ?? uniqueStagedName(stagingDir, requestedName)
        const stagedPath = containedPath(stagingDir, safeName)
        const vmRelativePath = `_uploads/${stagingKey}/${safeName}`

        if (!existingName) {
          writtenPaths.push(stagedPath)
          await Bun.write(stagedPath, buffer)
        }

        const ext = fileExtension(safeName)

        if (ATTACHMENT_TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/')) {
          const text = await Bun.file(stagedPath).text()
          fileBlocks.push(`<file name="${vmRelativePath}">\n${text}\n</file>`)
          continue
        }

        const isPiImage =
          ATTACHMENT_IMAGE_EXTENSIONS.has(ext) ||
          (file.type.startsWith('image/') &&
            ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type))

        if (isPiImage) {
          images.push(await readImageForPi(stagedPath, file, ext))
          fileBlocks.push(`<file name="${vmRelativePath}"></file>`)
          continue
        }

        hasStagedDocuments = true
        fileBlocks.push(`<file name="${vmRelativePath}"></file>`)
      }
    } catch (error) {
      removeWrittenFiles()
      throw error
    }

    let claimed = false
    let rolledBack = false
    return {
      images,
      content: buildAttachmentPrompt(userMessage, fileBlocks, hasStagedDocuments),
      uploadId: stagingKey,
      usage,
      claim() {
        claimed = true
      },
      async rollback() {
        if (claimed || rolledBack) return
        rolledBack = true
        await withStagingLock(stagingDir, async () => removeWrittenFiles())
      }
    }
  })
}

/** Removes all staged uploads for a conversation. Called when the conversation VM is destroyed. */
export async function cleanupConversationUploads(
  uploadRoot: string,
  convId: string
): Promise<void> {
  const stagingDir = conversationStagingDir(uploadRoot, convId)
  await withStagingLock(stagingDir, async () => {
    if (!existsSync(stagingDir)) return
    try {
      rmSync(stagingDir, { recursive: true, force: true })
    } catch {}
  })
}
