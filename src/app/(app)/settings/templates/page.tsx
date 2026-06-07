'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Upload, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { EmptyState } from '@/components/common/empty-state'
import { FileUploadZone } from '@/components/deliverables/file-upload-zone'
import { AdminNotice, useIsAdmin } from '@/components/settings/admin-notice'
import { useTemplates, useUploadTemplate, useDeleteTemplate } from '@/hooks/use-templates'
import { PLACEHOLDER_REFERENCE } from '@/lib/templates/placeholder-schema'

const KIND_LABEL: Record<string, string> = { docx_template: 'DOCX template', text_source: 'Standard text' }

function UploadCard() {
  const upload = useUploadTemplate()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('docx_template')
  const [category, setCategory] = useState('')

  async function handleUpload() {
    if (!file) return toast.error('Select a file')
    if (!name.trim()) return toast.error('Name is required')
    try {
      await upload.mutateAsync({ file, name: name.trim(), kind, category: category.trim() || undefined })
      toast.success('Template uploaded')
      setFile(null)
      setName('')
      setCategory('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <FileUploadZone onFile={(f) => { setFile(f); if (!name) setName(f.name.replace(/\.[^.]+$/, '')) }} selectedName={file?.name} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Label>Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Kind</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="docx_template">DOCX template ({'{'}placeholders{'}'})</option>
              <option value="text_source">Standard-text source</option>
            </select>
          </div>
          <div>
            <Label>Category (optional)</Label>
            <Input className="mt-1" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. proposal" />
          </div>
        </div>
        <div>
          <Button onClick={handleUpload} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TemplatesPage() {
  const { data, isLoading, error } = useTemplates()
  const del = useDeleteTemplate()
  const isAdmin = useIsAdmin()
  const templates = data ?? []

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id)
      toast.success('Template deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload branded <span className="font-medium">DOCX templates</span> with{' '}
        <code className="rounded bg-muted px-1">{'{placeholders}'}</code> (filled on generation, keeping your Word
        formatting), or <span className="font-medium">standard-text sources</span> whose text becomes reusable snippets
        in the Proposal tab.
      </p>
      <AdminNotice />

      {isAdmin && <UploadCard />}

      {error ? (
        <ErrorMessage message="Failed to load templates" />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : templates.length === 0 ? (
        <EmptyState message="No templates yet" hint="Upload a DOCX template or a standard-text source to get started." />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">{KIND_LABEL[t.kind] ?? t.kind}</Badge>
                      {t.docType.toUpperCase()}
                      {t.category ? ` · ${t.category}` : ''}
                      {t.snippets?.length ? ` · ${t.snippets.length} snippets` : ''}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="icon" aria-label="Delete template" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">DOCX placeholder reference</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Use these tags in your <code className="rounded bg-muted px-1">.docx</code> template. Loops repeat for each
            item between the open/close tags.
          </p>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {PLACEHOLDER_REFERENCE.map((p) => (
              <div key={p.tag} className="flex items-baseline gap-2 text-sm">
                <code className="rounded bg-muted px-1 text-xs">{p.tag}</code>
                <span className="text-muted-foreground">{p.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
