'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorMessage } from '@/components/common/error-message'
import { FileUploadZone } from '@/components/deliverables/file-upload-zone'
import { DeliverableList } from '@/components/deliverables/deliverable-list'
import { GenerateMenu } from '@/components/deliverables/generate-menu'
import { useDeliverables, useUploadDeliverable } from '@/hooks/use-deliverables'

function AddDeliverableDialog({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const upload = useUploadDeliverable(opportunityId)

  async function handleUpload() {
    setError('')
    if (!file) return setError('Select a file')
    if (!name.trim()) return setError('Name is required')
    try {
      await upload.mutateAsync({ file, name: name.trim(), description: description.trim() || undefined })
      toast.success('Deliverable added')
      setFile(null)
      setName('')
      setDescription('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Upload file
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload deliverable</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <FileUploadZone onFile={(f) => { setFile(f); if (!name) setName(f.name) }} selectedName={file?.name} />
          <div>
            <Label htmlFor="deliv-name">Name</Label>
            <Input id="deliv-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="deliv-desc">Description</Label>
            <Input id="deliv-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button onClick={handleUpload} disabled={upload.isPending}>
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DeliverablesTab({ opportunityId }: { opportunityId: string }) {
  const { data, isLoading, error } = useDeliverables(opportunityId)
  const deliverables = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AddDeliverableDialog opportunityId={opportunityId} />
        <GenerateMenu opportunityId={opportunityId} />
      </div>

      {error ? (
        <ErrorMessage message="Failed to load deliverables" />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : deliverables.length === 0 ? (
        <EmptyState
          message="No deliverables yet"
          hint="Upload a file or generate a branded document from the opportunity data."
        />
      ) : (
        <DeliverableList opportunityId={opportunityId} deliverables={deliverables} />
      )}
    </div>
  )
}
