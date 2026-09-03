import { FileUpIcon } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

import { AttachmentItems } from '@/shared/components/AttachmentItems'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton } from '@/shared/components/ui/input-group'
import { filesFromDataTransfer, hasDraggedFiles } from '@/shared/lib/attachment-files'

import { ATTACHMENT_SUPPORTED_EXTENSIONS } from '../../../../../shared/attachment-extensions'

const ACCEPT = [...ATTACHMENT_SUPPORTED_EXTENSIONS].map((extension) => `.${extension}`).join(',')

export function AboutAttachmentField({
  files,
  errors,
  disabled,
  onAddFiles,
  onRemoveFile
}: {
  files: File[]
  errors: string[]
  disabled: boolean
  onAddFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dropActive, setDropActive] = useState(false)

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) return
    event.preventDefault()
    if (disabled) return
    dragDepthRef.current += 1
    setDropActive(true)
  }

  function handleDragLeave() {
    if (dragDepthRef.current === 0) return
    dragDepthRef.current -= 1
    if (dragDepthRef.current === 0) setDropActive(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) return
    event.preventDefault()
    dragDepthRef.current = 0
    setDropActive(false)
    if (!disabled) onAddFiles(filesFromDataTransfer(event.dataTransfer))
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onAddFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>Pièces jointes</FieldLabel>
      <FieldDescription>
        Optionnel · PDF, Office, images ou fichiers texte, jusqu’à 5 fichiers
      </FieldDescription>
      <InputGroup
        data-drop-active={dropActive}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => {
          if (!hasDraggedFiles(event.dataTransfer)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={handleChange}
        />
        {files.length > 0 ? (
          <InputGroupAddon align="block-start" className="flex-col items-stretch">
            <AttachmentItems attachments={files} onRemove={onRemoveFile} />
          </InputGroupAddon>
        ) : null}
        <InputGroupAddon align="block-end" className="justify-between">
          <span className="text-xs font-normal">Déposez des fichiers ici</span>
          <InputGroupButton
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <FileUpIcon />
            Parcourir
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldError id={`${inputId}-errors`} errors={errors.map((message) => ({ message }))} />
    </Field>
  )
}
