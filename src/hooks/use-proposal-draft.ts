'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import type { ProposalContentInput } from '@/lib/schemas/proposal'
import type { ProposalStructuredContent } from '@/types'
import { normalizeRaci } from '@/lib/raci'
import {
  useProposalContent,
  useSaveProposalContent,
  useProposalDefaults,
  useSaveProposalDefaults,
} from '@/hooks/use-proposal'

type Draft = Partial<ProposalContentInput>

/**
 * Shared proposal-content draft state with debounced auto-save, plus the global
 * defaults (for structured-block fallbacks) and the admin "save as default" action.
 * Used by both the Proposal tab and the Build Proposal dialog.
 */
export function useProposalDraft(opportunityId: string) {
  const { data: serverContent } = useProposalContent(opportunityId)
  const { data: defaults } = useProposalDefaults()
  const saveContent = useSaveProposalContent(opportunityId)
  const saveDefaults = useSaveProposalDefaults()
  const { user } = useUser()
  const isAdmin = (user?.publicMetadata?.role as string) === 'admin'

  const [content, setContent] = useState<Draft>({})
  const seededRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Seed the draft once from the server row (sync from external state).
  useEffect(() => {
    if (!seededRef.current && serverContent) {
      setContent(serverContent as Draft)
      seededRef.current = true
    }
  }, [serverContent])

  function flush(draft: Draft = content) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveContent.mutate(draft)
  }

  function update(patch: Draft) {
    setContent((prev) => {
      const next = { ...prev, ...patch }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveContent.mutate(next), 800)
      return next
    })
  }

  function onSaveDefault(key: keyof ProposalStructuredContent, value: unknown) {
    if (!defaults) return Promise.reject(new Error('Defaults not loaded'))
    // Normalise raci to the current matrix shape so validation passes even if the
    // stored singleton still holds the legacy array shape.
    return saveDefaults.mutateAsync({ ...defaults, raci: normalizeRaci(defaults.raci), [key]: value })
  }

  return { content, update, flush, isSaving: saveContent.isPending, defaults, isAdmin, onSaveDefault }
}
