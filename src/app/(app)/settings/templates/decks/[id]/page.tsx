import { DeckEditor } from '@/components/settings/deck-editor'

export default async function DeckEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DeckEditor templateId={id} />
}
