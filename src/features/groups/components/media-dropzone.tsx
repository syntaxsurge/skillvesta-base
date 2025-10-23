'use client'

import { Loader2, UploadCloud } from 'lucide-react'
import {
  type DragEvent,
  type KeyboardEvent,
  ReactNode,
  useCallback,
  useRef,
  useState
} from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MediaDropzoneProps = {
  accept?: string
  multiple?: boolean
  disabled?: boolean
  uploading?: boolean
  buttonLabel: string
  helperText?: string
  children?: ReactNode
  className?: string
  dropAreaClassName?: string
  onSelect: (files: File[]) => void
}

function fileMatchesAccept(file: File, accept?: string) {
  if (!accept) return true

  const patterns = accept
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)

  if (patterns.length === 0) return true

  const mime = file.type
  const name = file.name.toLowerCase()

  return patterns.some(pattern => {
    if (pattern === '*/*') return true
    if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -1)
      return mime.startsWith(base)
    }
    if (pattern.startsWith('.')) {
      return name.endsWith(pattern.toLowerCase())
    }
    return mime === pattern
  })
}

export function MediaDropzone({
  accept,
  multiple,
  disabled,
  uploading,
  buttonLabel,
  helperText,
  children,
  className,
  dropAreaClassName = 'min-h-[180px] p-6',
  onSelect
}: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const resetDrag = useCallback(() => setIsDragActive(false), [])

  const handleFileSelection = useCallback(
    (files: FileList | File[]) => {
      if (disabled || uploading) return

      const fileArray = Array.from(files).filter(file => fileMatchesAccept(file, accept))
      if (fileArray.length === 0) return

      const selected = multiple ? fileArray : fileArray.slice(0, 1)
      if (selected.length === 0) return

      onSelect(selected)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [accept, disabled, multiple, onSelect, uploading]
  )

  const openFileDialog = useCallback(() => {
    if (disabled || uploading) return
    inputRef.current?.click()
  }, [disabled, uploading])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (disabled || uploading) return
    event.dataTransfer.dropEffect = 'copy'
    setIsDragActive(true)
  }, [disabled, uploading])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    resetDrag()
  }, [resetDrag])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (disabled || uploading) {
        resetDrag()
        return
      }

      const files = event.dataTransfer.files
      if (files && files.length > 0) {
        handleFileSelection(files)
      }
      resetDrag()
    },
    [disabled, handleFileSelection, resetDrag, uploading]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openFileDialog()
      }
    },
    [openFileDialog]
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role='button'
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || uploading}
        onClick={openFileDialog}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-center outline-none transition',
          dropAreaClassName,
          !disabled && !uploading && 'hover:border-primary',
          (disabled || uploading) && 'cursor-not-allowed opacity-70',
          isDragActive && 'border-primary bg-primary/5 text-primary'
        )}
      >
        {children ?? (
          <div className='flex flex-col items-center gap-2 text-sm text-muted-foreground'>
            <UploadCloud className='h-6 w-6' />
            <span>Drag & drop files here, or use the button below.</span>
          </div>
        )}
        {uploading && (
          <div className='absolute inset-0 flex items-center justify-center rounded-lg bg-background/70'>
            <Loader2 className='h-6 w-6 animate-spin text-foreground' />
          </div>
        )}
      </div>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={openFileDialog}
          disabled={disabled || uploading}
        >
          <UploadCloud className='mr-2 h-4 w-4' />
          {buttonLabel}
        </Button>
        {uploading && (
          <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
        )}
      </div>
      {helperText && (
        <p className='text-center text-xs text-muted-foreground'>{helperText}</p>
      )}
      <input
        ref={inputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        className='hidden'
        onChange={event => {
          if (event.target.files) {
            handleFileSelection(event.target.files)
          }
        }}
      />
    </div>
  )
}
