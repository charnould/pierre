import { FileIcon, XIcon } from 'lucide-react'

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle
} from '@/shared/components/ui/attachment'
import { formatAttachmentBytes } from '@/shared/lib/attachment-files'

type ChatAttachment = {
  name: string
  size: number
}

function extensionLabel(name: string): string {
  const ext = name.split('.').pop()
  if (!ext || ext === name) return ''
  return ext.toUpperCase()
}

export function ChatAttachmentItems({
  attachments,
  previewUrls,
  onRemove,
  className
}: {
  attachments: ChatAttachment[]
  previewUrls?: Array<string | undefined>
  onRemove?: (index: number) => void
  className?: string
}) {
  if (attachments.length === 0) return null

  return (
    <AttachmentGroup className={className}>
      {attachments.map((attachment, index) => {
        const extension = extensionLabel(attachment.name)
        const size = formatAttachmentBytes(attachment.size)
        const previewUrl = previewUrls?.[index]
        return (
          <Attachment key={`${attachment.name}-${attachment.size}-${index}`} size="sm" state="done">
            {previewUrl ? (
              <AttachmentMedia variant="image">
                <img src={previewUrl} alt="" />
              </AttachmentMedia>
            ) : (
              <AttachmentMedia variant="icon">
                <FileIcon />
              </AttachmentMedia>
            )}
            <AttachmentContent>
              <AttachmentTitle title={attachment.name}>{attachment.name}</AttachmentTitle>
              <AttachmentDescription>
                {extension ? `${extension} · ${size}` : size}
              </AttachmentDescription>
            </AttachmentContent>
            {onRemove ? (
              <AttachmentActions>
                <AttachmentAction
                  type="button"
                  aria-label={`Retirer ${attachment.name}`}
                  onClick={() => onRemove(index)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            ) : null}
          </Attachment>
        )
      })}
    </AttachmentGroup>
  )
}
