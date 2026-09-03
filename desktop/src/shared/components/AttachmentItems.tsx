import { FileIcon, XIcon } from 'lucide-react'

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
import { formatAttachmentBytes } from '@/shared/lib/attachment-files'
import { cn } from '@/shared/lib/utils'

export type AttachmentItem = {
  name: string
  size: number
}

function attachmentExtensionLabel(name: string): string {
  const ext = name.split('.').pop()
  if (!ext || ext === name) return ''
  return ext.toUpperCase()
}

function attachmentStem(name: string): string {
  const lastDot = name.lastIndexOf('.')
  if (lastDot <= 0) return name
  return name.slice(0, lastDot)
}

const CHIP_META = 'text-muted-foreground pierre-type-micro shrink-0'

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

export function AttachmentItems({
  attachments,
  previewUrls,
  onRemove,
  className,
  layout = 'row'
}: {
  attachments: AttachmentItem[]
  previewUrls?: Array<string | undefined>
  onRemove?: (index: number) => void
  className?: string
  layout?: 'row' | 'chip'
}) {
  if (attachments.length === 0) return null

  return (
    <ItemGroup className={cn(layout === 'chip' && 'flex-row flex-wrap gap-2', className)}>
      {attachments.map((attachment, index) => {
        const extension = attachmentExtensionLabel(attachment.name)
        const stem = attachmentStem(attachment.name)
        const size = formatAttachmentBytes(attachment.size)
        return (
          <Item
            key={`${attachment.name}-${attachment.size}-${index}`}
            variant={layout === 'chip' ? 'muted' : 'default'}
            size="xs"
            className={layout === 'chip' ? 'w-fit max-w-full flex-nowrap' : undefined}
          >
            {layout === 'row' || previewUrls?.[index] ? (
              <AttachmentMedia previewUrl={previewUrls?.[index]} />
            ) : null}
            <ItemContent
              className={cn(
                'min-w-0',
                layout === 'chip' && 'flex-row items-center group-data-[size=xs]/item:gap-1.5'
              )}
            >
              {layout === 'chip' ? (
                <>
                  {extension ? (
                    <>
                      <span className={CHIP_META}>{extension}</span>
                      <span className={CHIP_META} aria-hidden>
                        ·
                      </span>
                    </>
                  ) : null}
                  <span className="min-w-0 truncate text-xs leading-4" title={attachment.name}>
                    {stem}
                  </span>
                  <span className={CHIP_META} aria-hidden>
                    ·
                  </span>
                  <span className={CHIP_META}>{size}</span>
                </>
              ) : (
                <>
                  <ItemTitle>{attachment.name}</ItemTitle>
                  <ItemDescription>{size}</ItemDescription>
                </>
              )}
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
        )
      })}
    </ItemGroup>
  )
}
