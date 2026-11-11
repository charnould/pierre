import { ATTACHMENT_SUPPORTED_EXTENSIONS } from '@pierre/shared/attachment-extensions'
import { useId } from 'react'

import { AttachmentItems } from '@/shared/components/AttachmentItems'
import { FileDrop } from '@/shared/components/FileDrop'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field'

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

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>Pièces jointes</FieldLabel>
      <FieldDescription>
        Optionnel · PDF, Office, images ou fichiers texte, jusqu’à 5 fichiers
      </FieldDescription>
      {files.length > 0 ? <AttachmentItems attachments={files} onRemove={onRemoveFile} /> : null}
      <FileDrop
        id={inputId}
        accept={ACCEPT}
        placeholder="Déposez des fichiers ici"
        multiple
        disabled={disabled}
        onFiles={onAddFiles}
      />
      <FieldError id={`${inputId}-errors`} errors={errors.map((message) => ({ message }))} />
    </Field>
  )
}
