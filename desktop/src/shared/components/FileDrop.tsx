import { cn } from 'cn'
import { FileUpIcon } from 'lucide-react'
import { type ChangeEvent, type DragEvent, useId, useRef, useState } from 'react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText
} from '@/shared/components/ui/input-group'
import { filesFromDataTransfer, hasDraggedFiles } from '@/shared/lib/attachment-files'

export function FileDrop({
  id,
  className,
  accept,
  placeholder,
  multiple = false,
  disabled = false,
  onFiles
}: {
  id?: string
  className?: string
  accept: string
  placeholder: string
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dropActive, setDropActive] = useState(false)

  function emit(files: File[]) {
    const picked = multiple ? files : files.slice(0, 1)
    if (picked.length === 0) return
    onFiles(picked)
  }

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
    if (!disabled) emit(filesFromDataTransfer(event.dataTransfer))
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    emit(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  return (
    <InputGroup
      className={cn('justify-between', className)}
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
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={handleChange}
      />
      <InputGroupAddon align="inline-start">
        <InputGroupText>{placeholder}</InputGroupText>
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
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
  )
}
