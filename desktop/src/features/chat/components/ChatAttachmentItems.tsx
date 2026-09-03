import { FileIcon, XIcon } from 'lucide-react'

import { formatAttachmentBytes } from '@/features/chat/lib/chat-drop-files'
import type { ChatAttachment } from '@/features/chat/lib/chat-session-types'
import { InputGroupButton } from '@/shared/components/ui/input-group'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle
} from '@/shared/components/ui/item'

function AttachmentMedia({ previewUrl }: { previewUrl?: string }) {
  return previewUrl ? (
    <ItemMedia variant="image">
      <img src={previewUrl} alt="" />
    </ItemMedia>
  ) : (
    <ItemMedia variant="icon">
      <FileIcon />
    </ItemMedia>
  )
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
    <ItemGroup className={className}>
      {attachments.map((attachment, index) => (
        <Item key={`${attachment.name}-${attachment.size}-${index}`} size="xs">
          <AttachmentMedia previewUrl={previewUrls?.[index]} />
          <ItemContent className="min-w-0">
            <ItemTitle>{attachment.name}</ItemTitle>
            <ItemDescription>{formatAttachmentBytes(attachment.size)}</ItemDescription>
          </ItemContent>
          {onRemove ? (
            <ItemActions>
              <InputGroupButton
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={`Retirer ${attachment.name}`}
                onClick={() => onRemove(index)}
              >
                <XIcon />
              </InputGroupButton>
            </ItemActions>
          ) : null}
        </Item>
      ))}
    </ItemGroup>
  )
}
