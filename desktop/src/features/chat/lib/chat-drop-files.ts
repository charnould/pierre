export {
  filesFromDataTransfer,
  formatAttachmentBytes,
  hasDraggedFiles,
  mergeAttachmentFiles as mergeChatDropFiles
} from '@/shared/lib/attachment-files'

export type {
  AttachmentMergeResult as ChatDropResult,
  AttachmentUsage as ChatAttachmentUsage
} from '@/shared/lib/attachment-files'
