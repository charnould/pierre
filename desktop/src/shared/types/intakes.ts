export type {
  CreateIntakeBody,
  IntakeAllowedMime,
  IntakeConfig,
  IntakeField,
  IntakeFieldType,
  IntakeNotificationSchedule,
  IntakeRecord,
  IntakeStatus,
  PatchIntakeBody
} from '@pierre/shared/intakes'

export {
  INTAKE_ALLOWED_MIMES,
  INTAKE_FIELD_TYPE_LABELS,
  INTAKE_FIELD_TYPES,
  INTAKE_MAX_FILE_BYTES,
  INTAKE_MAX_FIELDS,
  INTAKE_MAX_FILES_PER_FIELD,
  INTAKE_MIME_LABELS,
  intakeFieldColumnName,
  isIntakeInputField,
  isReservedIntakeColumn,
  validateIntakeTableName
} from '@pierre/shared/intakes'

import type { CreateIntakeBody, PatchIntakeBody } from '@pierre/shared/intakes'

export const INTAKE_LIFECYCLE_ACTIONS = ['publish', 'revoke', 'close', 'reopen', 'purge'] as const
export type IntakeLifecycleAction = (typeof INTAKE_LIFECYCLE_ACTIONS)[number]
export type ListIntakesParams = { url: string }
export type CreateIntakePayload = { url: string } & CreateIntakeBody
export type PatchIntakePayload = { url: string; id: string; patch: PatchIntakeBody }
export type IntakeActionPayload = { url: string; id: string }
export type RunIntakeActionPayload = {
  url: string
  id: string
  action: IntakeLifecycleAction
}
export type ExportIntakeZipPayload = { url: string; id: string; suggestedFilename?: string }
export type DownloadIntakeFilePayload = {
  url: string
  id: string
  submissionId: string
  filename: string
}
