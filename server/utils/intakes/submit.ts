import { z } from 'zod/v4'

import { isCivilDay } from '../../../shared/activity-content'
import {
  INTAKE_LONG_TEXT_MAX,
  INTAKE_MAX_FILE_BYTES,
  INTAKE_MAX_TOTAL_BYTES,
  INTAKE_SHORT_TEXT_MAX,
  intakeFieldColumnName,
  type IntakeFileField,
  type IntakeRecord,
  type IntakeSingleChoiceField,
  type IntakeTextField,
  isIntakeInputField
} from '../../../shared/intakes'
import { normalize_french_national_phone } from '../contacts'
import { deduplicateFilename, type IntakeUploadFile, sniffAllowedMime } from './files'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATETIME_LOCAL_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/
const DECIMAL_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/
const EmailSchema = z.email()

type ScalarInputField = IntakeTextField | IntakeSingleChoiceField

export type IntakeSubmissionValidationResult =
  | {
      ok: true
      submissionId: string
      columnValues: Record<string, string | number | null>
      files: IntakeUploadFile[]
    }
  | {
      ok: false
      kind: 'honeypot' | 'password_invalid' | 'validation_error'
      message: string
      fields?: Record<string, string>
    }

function isValidLocalDateTime(value: string): boolean {
  const match = DATETIME_LOCAL_RE.exec(value)
  if (!match) return false
  if (!isCivilDay(match[1])) return false
  const hour = Number(match[2])
  const minute = Number(match[3])
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

function stringEntries(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function fileEntries(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter(
      (entry): entry is File => entry instanceof File && (entry.name !== '' || entry.size > 0)
    )
}

function formatMaxFileSize(maxBytes: number): string {
  if (maxBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(maxBytes / 1024))} Ko`
  }
  return `${Math.round((maxBytes / (1024 * 1024)) * 10) / 10} Mo`
}

async function validateFileField(
  col: string,
  field: IntakeFileField,
  rawFiles: readonly File[],
  totalFileBytes: number,
  usedFilenames: Set<string>
): Promise<
  | { ok: true; value: string | null; uploads: IntakeUploadFile[]; bytes: number }
  | { ok: false; error: string }
> {
  if (rawFiles.length === 0) {
    return field.required
      ? { ok: false, error: 'Ce document est obligatoire.' }
      : { ok: true, value: null, uploads: [], bytes: 0 }
  }

  const maxFiles = field.maxFiles ?? 1
  if (rawFiles.length > maxFiles) {
    const plural = maxFiles > 1 ? 's' : ''
    return { ok: false, error: `Maximum ${maxFiles} fichier${plural} autorisé${plural}.` }
  }

  const maxBytes = Math.min(field.maxFileBytes ?? INTAKE_MAX_FILE_BYTES, INTAKE_MAX_FILE_BYTES)
  const pendingUploads: IntakeUploadFile[] = []
  let pendingBytes = 0

  for (const file of rawFiles) {
    if (file.size === 0) {
      return { ok: false, error: `Le fichier « ${file.name} » est vide.` }
    }
    if (file.size > maxBytes) {
      return {
        ok: false,
        error: `Le fichier « ${file.name} » dépasse la taille maximale (${formatMaxFileSize(maxBytes)}).`
      }
    }
    if (totalFileBytes + pendingBytes + file.size > INTAKE_MAX_TOTAL_BYTES) {
      return { ok: false, error: 'La taille cumulée des fichiers dépasse 25 Mo.' }
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const detectedMime = sniffAllowedMime(bytes)
    if (!detectedMime || !field.accept.includes(detectedMime)) {
      return { ok: false, error: `Le fichier « ${file.name} » n’est pas dans un format autorisé.` }
    }
    pendingBytes += file.size
    pendingUploads.push({ field: col, filename: file.name, mimeType: detectedMime, bytes })
  }

  const uploads: IntakeUploadFile[] = []
  const acceptedNames: string[] = []
  for (const upload of pendingUploads) {
    const uniqueName = deduplicateFilename(upload.filename, usedFilenames)
    uploads.push({ ...upload, filename: uniqueName })
    acceptedNames.push(uniqueName)
  }

  return { ok: true, value: JSON.stringify(acceptedNames), uploads, bytes: pendingBytes }
}

function validateScalarField(
  field: ScalarInputField,
  text: string
): { ok: true; value: string | number } | { ok: false; error: string } {
  switch (field.type) {
    case 'short_text':
      return text.length > INTAKE_SHORT_TEXT_MAX
        ? { ok: false, error: `Maximum ${INTAKE_SHORT_TEXT_MAX} caractères.` }
        : { ok: true, value: text }
    case 'long_text':
      return text.length > INTAKE_LONG_TEXT_MAX
        ? { ok: false, error: `Maximum ${INTAKE_LONG_TEXT_MAX} caractères.` }
        : { ok: true, value: text }
    case 'number': {
      const normalized = text.replace(',', '.')
      const num = DECIMAL_NUMBER_RE.test(normalized) ? Number(normalized) : Number.NaN
      return Number.isFinite(num)
        ? { ok: true, value: num }
        : { ok: false, error: 'Veuillez saisir un nombre valide.' }
    }
    case 'date':
      return isCivilDay(text)
        ? { ok: true, value: text }
        : { ok: false, error: 'Veuillez saisir une date valide (AAAA-MM-JJ).' }
    case 'datetime':
      return isValidLocalDateTime(text)
        ? { ok: true, value: text }
        : { ok: false, error: 'Veuillez saisir une date et une heure valides.' }
    case 'email': {
      const lowered = text.toLowerCase()
      return EmailSchema.safeParse(lowered).success
        ? { ok: true, value: lowered }
        : { ok: false, error: 'Veuillez saisir une adresse courriel valide.' }
    }
    case 'phone': {
      const normalized = normalize_french_national_phone(text)
      return normalized
        ? { ok: true, value: normalized }
        : {
            ok: false,
            error: 'Veuillez saisir un numéro de téléphone français valide (10 chiffres).'
          }
    }
    case 'single_choice':
      return field.options.includes(text)
        ? { ok: true, value: text }
        : { ok: false, error: 'Option sélectionnée invalide.' }
  }
}

export async function validateIntakeSubmission(
  intake: Pick<IntakeRecord, 'config'>,
  formData: FormData
): Promise<IntakeSubmissionValidationResult> {
  const honeypot = formData.get('_website')
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { ok: false, kind: 'honeypot', message: 'Soumission rejetée' }
  }

  if (intake.config.access.passwords.length > 0) {
    const rawPassword = formData.get('_password')
    const password = typeof rawPassword === 'string' ? rawPassword : ''
    if (!intake.config.access.passwords.includes(password)) {
      return {
        ok: false,
        kind: 'password_invalid',
        message: 'Mot de passe incorrect',
        fields: { _password: 'Mot de passe incorrect.' }
      }
    }
  }

  const rawId = formData.get('_id')
  const submissionId = typeof rawId === 'string' ? rawId.trim() : ''
  if (!UUID_RE.test(submissionId)) {
    return {
      ok: false,
      kind: 'validation_error',
      message: 'Identifiant de soumission invalide',
      fields: { _id: 'Veuillez recharger la page et réessayer.' }
    }
  }

  const fields: Record<string, string> = {}
  const columnValues: Record<string, string | number | null> = {}
  const uploadedFiles: IntakeUploadFile[] = []
  const usedFilenames = new Set<string>()
  let totalFileBytes = 0

  for (const field of intake.config.form.fields) {
    if (!isIntakeInputField(field)) continue
    const col = intakeFieldColumnName(field.label)

    if (field.type === 'checkbox') {
      const checked = formData.getAll(col).some((v) => v === '1' || v === 'true' || v === 'on')
      if (field.required && !checked) fields[col] = 'Cette case doit être cochée.'
      else columnValues[col] = checked ? 1 : 0
      continue
    }

    if (field.type === 'multiple_choice') {
      const selected = [...new Set(stringEntries(formData, col))]
      if (selected.length === 0) {
        if (field.required) fields[col] = 'Sélectionnez au moins une option.'
        else columnValues[col] = null
        continue
      }
      const allowed = new Set(field.options)
      if (selected.some((value) => !allowed.has(value))) {
        fields[col] = 'Option sélectionnée invalide.'
      } else {
        columnValues[col] = JSON.stringify(selected)
      }
      continue
    }

    if (field.type === 'file') {
      const result = await validateFileField(
        col,
        field,
        fileEntries(formData, col),
        totalFileBytes,
        usedFilenames
      )
      if (!result.ok) {
        fields[col] = result.error
      } else {
        totalFileBytes += result.bytes
        uploadedFiles.push(...result.uploads)
        columnValues[col] = result.value
      }
      continue
    }

    const rawEntry = formData.get(col)
    const text = typeof rawEntry === 'string' ? rawEntry.trim() : ''
    if (text === '') {
      if (field.required) fields[col] = 'Ce champ est obligatoire.'
      else columnValues[col] = null
      continue
    }

    const result = validateScalarField(field, text)
    if (!result.ok) fields[col] = result.error
    else columnValues[col] = result.value
  }

  if (Object.keys(fields).length > 0) {
    return {
      ok: false,
      kind: 'validation_error',
      message: 'Veuillez corriger les champs en erreur.',
      fields
    }
  }

  return { ok: true, submissionId, columnValues, files: uploadedFiles }
}
