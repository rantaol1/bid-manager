'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { History, Save, RotateCcw, Copy, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorMessage } from '@/components/common/error-message'
import { EmptyState } from '@/components/common/empty-state'
import { useRevisions, useRevisionMutations, type RevisionListItem } from '@/hooks/use-revisions'
import { formatCurrency } from '@/lib/utils'

function SaveRevisionDialog({ opportunityId }: { opportunityId: string }) {
  const { createRevision } = useRevisionMutations(opportunityId)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    try {
      await createRevision.mutateAsync({ label: label.trim(), note: note.trim() || undefined })
      toast.success('Revision saved')
      setLabel('')
      setNote('')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save revision')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4" />
            Save as revision
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as revision</DialogTitle>
          <DialogDescription>
            Snapshot the current roles, phases and allocations. You can restore it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="grid gap-4">
          <div>
            <Label htmlFor="rev-label">Label</Label>
            <Input
              id="rev-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Baseline"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rev-note">Note (optional)</Label>
            <Textarea
              id="rev-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!label.trim() || createRevision.isPending}>
              {createRevision.isPending ? 'Saving…' : 'Save revision'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RevisionRow({
  opportunityId,
  rev,
  currency,
}: {
  opportunityId: string
  rev: RevisionListItem
  currency: string
}) {
  const { restoreRevision, deleteRevision, renameRevision, createRevision } =
    useRevisionMutations(opportunityId)
  const [confirm, setConfirm] = useState<null | 'restore' | 'delete'>(null)
  const [renaming, setRenaming] = useState(false)
  const [label, setLabel] = useState(rev.label)

  const cost = rev.summary ? formatCurrency(rev.summary.projectTotalCost, currency) : '—'

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      toast.success(success)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setConfirm(null)
    }
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-2 border-b py-2 last:border-0">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8" />
        <Button
          size="sm"
          disabled={!label.trim() || renameRevision.isPending}
          onClick={() =>
            run(async () => {
              await renameRevision.mutateAsync({ revId: rev.id, label: label.trim() })
              setRenaming(false)
            }, 'Renamed')
          }
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setLabel(rev.label)
            setRenaming(false)
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (confirm) {
    const isRestore = confirm === 'restore'
    return (
      <div className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
        <span className="text-sm">
          {isRestore ? 'Restore and overwrite the working copy?' : `Delete "${rev.label}"?`}
        </span>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={isRestore ? 'default' : 'destructive'}
            disabled={restoreRevision.isPending || deleteRevision.isPending}
            onClick={() =>
              isRestore
                ? run(() => restoreRevision.mutateAsync(rev.id), 'Revision restored')
                : run(() => deleteRevision.mutateAsync(rev.id), 'Revision deleted')
            }
          >
            {isRestore ? 'Restore' : 'Delete'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{rev.label}</span>
          {rev.kind === 'ai' && (
            <span className="rounded bg-magenta-50 px-1.5 py-0.5 text-[10px] font-medium text-magenta-600">
              AI
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {cost} · {format(new Date(rev.createdAt), 'd MMM yyyy')}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Restore" onClick={() => setConfirm('restore')}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Duplicate"
          disabled={createRevision.isPending}
          onClick={() =>
            run(
              () =>
                createRevision.mutateAsync({
                  label: `${rev.label} (copy)`,
                  kind: rev.kind === 'ai' ? 'ai' : 'manual',
                  fromRevisionId: rev.id,
                }),
              'Revision duplicated'
            )
          }
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Rename" onClick={() => setRenaming(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setConfirm('delete')}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

function RevisionsPanel({ opportunityId, currency }: { opportunityId: string; currency: string }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, error } = useRevisions(opportunityId)
  const count = data?.length ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <History className="h-4 w-4" />
            Revisions{count > 0 ? ` (${count})` : ''}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Estimation revisions</DialogTitle>
          <DialogDescription>
            Restore overwrites the current working copy (roles, phases, allocations) and discards
            unsaved matrix edits.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <ErrorMessage message="Failed to load revisions" />
        ) : count === 0 ? (
          <EmptyState
            message="No revisions yet"
            hint="Use Save as revision to snapshot the current estimation."
          />
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {data!.map((rev) => (
              <RevisionRow key={rev.id} opportunityId={opportunityId} rev={rev} currency={currency} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function RevisionMenu({
  opportunityId,
  currency,
}: {
  opportunityId: string
  currency: string
}) {
  return (
    <div className="flex gap-2">
      <SaveRevisionDialog opportunityId={opportunityId} />
      <RevisionsPanel opportunityId={opportunityId} currency={currency} />
    </div>
  )
}
