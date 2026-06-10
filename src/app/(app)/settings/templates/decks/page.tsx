'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Presentation, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { EmptyState } from '@/components/common/empty-state'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import {
  useDeckTemplates,
  useCreateDeckTemplate,
  useDeleteDeckTemplate,
} from '@/hooks/use-deck-templates'
import type { DeliverableType } from '@/lib/documents/proposal-sections'

const KIND_LABEL: Record<string, string> = { full_proposal: 'Full proposal', board_summary: 'Board summary' }

function CreateCard() {
  const create = useCreateDeckTemplate()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<DeliverableType>('full_proposal')

  async function handleCreate() {
    if (!name.trim()) return toast.error('Name is required')
    try {
      await create.mutateAsync({ name: name.trim(), kind })
      toast.success('Deck template created')
      setName('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New deck template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <Label>Name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Manufacturing pitch" />
        </div>
        <div>
          <Label>Kind</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as DeliverableType)}
          >
            <option value="full_proposal">Full proposal</option>
            <option value="board_summary">Board summary</option>
          </select>
        </div>
        <Button onClick={handleCreate} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DeckTemplatesPage() {
  const { data, isLoading, error } = useDeckTemplates()
  const del = useDeleteDeckTemplate()
  const isAdmin = useIsAdmin()
  const templates = data ?? []

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id)
      toast.success('Deck template deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edit the modelled proposal slides in-app and save them as reusable, branded <span className="font-medium">deck templates</span>.
        Each template keeps a version history; opportunities pick which version to use for their generated PowerPoint outputs.
      </p>
      <AdminNotice />

      {isAdmin && <CreateCard />}

      {error ? (
        <ErrorMessage message="Failed to load deck templates" />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : templates.length === 0 ? (
        <EmptyState message="No deck templates yet" hint="Create one to start editing slides." />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <Link href={`/settings/templates/decks/${t.id}`} className="flex flex-1 items-start gap-3">
                  <Presentation className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">{KIND_LABEL[t.kind] ?? t.kind}</Badge>
                      {t.isWorkspaceDefault && <Badge className="mr-2">Workspace default</Badge>}
                      {t.versions.length} version{t.versions.length === 1 ? '' : 's'}
                      {t.description ? ` · ${t.description}` : ''}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  {isAdmin && !t.isWorkspaceDefault && (
                    <Button variant="ghost" size="icon" aria-label="Delete deck template" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" render={<Link href={`/settings/templates/decks/${t.id}`} aria-label="Open editor" />}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
