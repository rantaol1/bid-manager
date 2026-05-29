'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

interface Props {
  onFile: (file: File) => void
  selectedName?: string
  disabled?: boolean
}

export function FileUploadZone({ onFile, selectedName, disabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0])
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors',
        isDragActive ? 'border-magenta bg-magenta/5' : 'hover:bg-accent',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="h-6 w-6 text-muted-foreground" />
      {selectedName ? (
        <p className="text-sm font-medium">{selectedName}</p>
      ) : (
        <>
          <p className="text-sm font-medium">Drop a file here, or click to browse</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX, XLSX or images · max 25 MB</p>
        </>
      )}
    </div>
  )
}
