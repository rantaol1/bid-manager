'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileType2, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiFetch } from '@/lib/fetcher'
import { useTemplates } from '@/hooks/use-templates'

export function TemplateGenerateMenu({ opportunityId }: { opportunityId: string }) {
  const { data: templates } = useTemplates({ kind: 'docx_template' })
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const list = templates ?? []

  async function generate(templateId: string, name: string) {
    setBusy(true)
    try {
      await apiFetch(`/api/opportunities/${opportunityId}/generate/from-template`, {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      })
      toast.success(`Generated ${name}`)
      qc.invalidateQueries({ queryKey: ['deliverables', opportunityId] })
      qc.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  if (list.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType2 className="h-4 w-4" />}
            From template
            <ChevronDown className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        {list.map((t) => (
          <DropdownMenuItem key={t.id} disabled={busy} onClick={() => generate(t.id, t.name)}>
            {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
