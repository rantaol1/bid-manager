'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiFetch } from '@/lib/fetcher'

const DOCS = [
  { key: 'estimate', label: 'Resource Estimate (DOCX)' },
  { key: 'pricing', label: 'Pricing Summary (DOCX)' },
  { key: 'timeline', label: 'Project Timeline (PPTX)' },
  { key: 'summary', label: 'Executive Summary (PPTX)' },
]

export function GenerateMenu({ opportunityId }: { opportunityId: string }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)

  async function generate(key: string, label: string) {
    setBusy(key)
    try {
      await apiFetch(`/api/opportunities/${opportunityId}/generate/${key}`, { method: 'POST' })
      toast.success(`Generated ${label}`)
      qc.invalidateQueries({ queryKey: ['deliverables', opportunityId] })
      qc.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate document
            <ChevronDown className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        {DOCS.map((doc) => (
          <DropdownMenuItem key={doc.key} disabled={busy !== null} onClick={() => generate(doc.key, doc.label)}>
            {doc.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
