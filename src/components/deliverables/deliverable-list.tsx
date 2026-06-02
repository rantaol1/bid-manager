'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { FileText, History, Upload, Trash2, Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { FileUploadZone } from '@/components/deliverables/file-upload-zone'
import { VersionHistory } from '@/components/deliverables/version-history'
import {
  useUploadVersion,
  useDeleteDeliverable,
  type DeliverableDTO,
} from '@/hooks/use-deliverables'

const TYPE_LABELS: Record<string, string> = {
  upload: 'Upload',
  estimate: 'Resource Estimate',
  pricing: 'Pricing Summary',
  timeline: 'Project Timeline',
  summary: 'Executive Summary',
  proposal: 'Full Proposal',
  board_summary: 'Board Summary',
}

function NewVersionDialog({ opportunityId, deliverable }: { opportunityId: string; deliverable: DeliverableDTO }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState('')
  const upload = useUploadVersion(opportunityId)

  async function handleUpload() {
    if (!file) return
    try {
      await upload.mutateAsync({ deliverableId: deliverable.id, file, changeSummary: summary })
      toast.success('New version uploaded')
      setFile(null)
      setSummary('')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        New version
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload new version of {deliverable.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <FileUploadZone onFile={setFile} selectedName={file?.name} />
          <div>
            <Label htmlFor="summary">Change summary</Label>
            <Input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button onClick={handleUpload} disabled={!file || upload.isPending}>
              {upload.isPending ? 'Uploading…' : 'Upload version'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DeliverableList({
  opportunityId,
  deliverables,
}: {
  opportunityId: string
  deliverables: DeliverableDTO[]
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const deleteDeliverable = useDeleteDeliverable(opportunityId)

  async function handleDelete(deliverableId: string) {
    try {
      await deleteDeliverable.mutateAsync(deliverableId)
      toast.success('Deliverable deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-3">
      {deliverables.map((d) => {
        const latest = d.versions[0]
        const isOpen = expanded === d.id
        return (
          <Card key={d.id}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">
                        {TYPE_LABELS[d.type] ?? d.type}
                      </Badge>
                      v{d.currentVersion} · updated {format(new Date(d.updatedAt), 'd MMM yyyy')}
                    </p>
                    {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {latest && (
                    <a
                      href={`/api/deliverables/versions/${latest.id}/download`}
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  )}
                  <NewVersionDialog opportunityId={opportunityId} deliverable={d} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(isOpen ? null : d.id)}
                  >
                    <History className="h-4 w-4" />
                    {d.versions.length}
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  <ConfirmDialog
                    title="Delete deliverable?"
                    description={`Delete "${d.name}" and all its versions.`}
                    confirmLabel="Delete"
                    onConfirm={() => handleDelete(d.id)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Delete deliverable">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                  />
                </div>
              </div>
              {isOpen && (
                <div className="mt-4 border-t pt-4">
                  <VersionHistory versions={d.versions} />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
