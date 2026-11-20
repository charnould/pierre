export type {
  ActivitiesListResponse,
  Activity,
  ActivityContext,
  ActivityFeedSyncData,
  ActivityFeedSyncResult,
  ActivityListItem,
  ActivityPatch,
  ActivityResponse,
  ActivityType,
  ActivityValue,
  CommunicationChannel,
  CreateActivityBody,
  CreateActivityPayload,
  DeleteActivityPayload,
  DeleteActivityResponse,
  GetActivitiesParams,
  GetActivityFeedSyncParams,
  MailDocument,
  Mention,
  PatchActivityPayload,
  PostalAddress,
  RecordExternalCommunicationPayload,
  SendCommunicationPayload,
  SendCommunicationResponse,
  TaskState
} from '@pierre/shared/activities'

export type { IntakeSubmittedContent, TaskContent } from '@pierre/shared/activity-content'

export {
  ACTIVITY_CONTENT_VERSION,
  activityTimestamp,
  communicationChannelLabel,
  isActivityMetaType,
  isCaseChangeType,
  isCommunicationOpenedType,
  isCommunicationStatusType,
  isHiddenTimelineType,
  isNoteType,
  isSignatureType,
  isTaskType,
  mentionOf
} from '@pierre/shared/activities'

export {
  activityPayload,
  activityText,
  caseChangeContent,
  completedTaskContent,
  parseActivityContent,
  parseActivityMetaContent,
  parseCaseChangeContent,
  parseCommunicationOpenedContent,
  parseCommunicationStatusContent,
  parseContentJson,
  parseIntakeSubmittedContent,
  parseNoteContent,
  parseSignatureContent,
  parseTaskContent,
  parseTitledContent
} from '@pierre/shared/activity-content'

export { parseRepaymentCaseFileContent } from '@pierre/shared/repayment-case-file'
