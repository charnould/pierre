import React, { useRef, useState, useImperativeHandle, forwardRef, type DragEvent } from 'react'

interface DropzoneProps {
  onFilesUpdated?: (files: File[]) => void
}

export interface DropzoneRef {
  getFiles: () => File[]
}

export const Dropzone = forwardRef<DropzoneRef, DropzoneProps>(({ onFilesUpdated }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])

  useImperativeHandle(
    ref,
    () => ({
      getFiles: () => files
    }),
    [files]
  )

  const updateFiles = (newFiles: File[]) => {
    setFiles(newFiles)
    onFilesUpdated?.(newFiles)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    updateFiles([...files, ...Array.from(e.target.files)])
  }

  const handleRemoveFile = (index: number) => {
    updateFiles(files.filter((_, i) => i !== index))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) updateFiles([...files, ...Array.from(e.dataTransfer.files)])
  }

  return (
    <div
      className="dropzone"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {files.length === 0 ? (
        <p className="dropzone__call-to-action">Glisser les PDF pertinents (optionnels)</p>
      ) : (
        <ul>
          {files.map((file, i) => (
            <li key={i} className="dropzone--file">
              <span className="dropzone__filename">{file.name}</span>
              <button
                type="button"
                className="dropzone__detach"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFile(i)
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
