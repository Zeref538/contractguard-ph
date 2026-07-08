import { useRef, useState, type DragEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Props {
  onUpload: (file: File) => void
  loading: boolean
  error: string | null
}

export function UploadScreen({ onUpload, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function pick(files: FileList | null) {
    const file = files?.[0]
    if (file) onUpload(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!loading) pick(e.dataTransfer.files)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyzing contract…</CardTitle>
          <CardDescription>
            Segmenting clauses and checking each against the Labor Code. This
            usually takes under a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Skeleton className='h-6 w-full' />
          <Skeleton className='h-6 w-5/6' />
          <Skeleton className='h-6 w-2/3' />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      {error && (
        <Alert variant='destructive'>
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Upload an employment contract</CardTitle>
          <CardDescription>
            Text-based PDF, max 10 MB. Employment contracts only — freelance
            and service agreements are out of scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role='button'
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'border-muted-foreground/25 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-12 text-center transition-colors',
              dragging && 'border-primary bg-primary/5'
            )}
          >
            <p className='font-medium'>Drag a PDF here, or click to browse</p>
            <p className='text-muted-foreground text-sm'>
              The contract is analyzed and never stored.
            </p>
            <Button variant='secondary' className='mt-2 pointer-events-none'>
              Choose file
            </Button>
          </div>
          <input
            ref={inputRef}
            type='file'
            accept='application/pdf'
            className='hidden'
            onChange={(e) => pick(e.target.files)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
