import React, { useRef, useState, type DragEvent } from 'react'
//import { pdf2md } from '@opendocsg/pdf2md'

interface PdfContent {
  file: File
  text: string
}

interface DropzoneProps {
  onFilesUpdated?: (files: File[], pdfContents: PdfContent[]) => void
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesUpdated }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : []
    await addFiles(selectedFiles)
    e.target.value = '' // reset
  }

  const addFiles = async (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles])

    const pdfContents: PdfContent[] = []

    for (const file of newFiles) {
      if (file.type === 'application/pdf') {
        try {
          //const buffer = await file.arrayBuffer()
          const text = 'test' //await pdf2md(new Uint8Array(buffer))
          pdfContents.push({ file, text })
        } catch (err) {
          console.error(`Failed to parse ${file.name}:`, err)
        }
      }
    }

    if (onFilesUpdated) {
      onFilesUpdated([...files, ...newFiles], pdfContents)
    }
  }

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    if (onFilesUpdated) {
      onFilesUpdated(updatedFiles, [])
    }
  }

  // Drag & drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) {
      await addFiles(Array.from(e.dataTransfer.files))
    }
  }

  return (
    <div
      className={`mb-4 cursor-pointer rounded border border-dashed border-white/40 p-3 text-center font-sans text-xs transition-all duration-300 ease-out ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-white/20 bg-transparent'} `}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p>Ajouter des fichiers (PDF uniquement)</p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {files.length > 0 && (
        <ul className="mt-2 px-2">
          {files.map((file, i) => (
            <li key={i} className="-mb-1 flex items-center justify-between gap-x-3">
              <span className="truncate text-xs">{file.name}</span>
              <button className="cursor-pointer" onClick={() => handleRemoveFile(i)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
