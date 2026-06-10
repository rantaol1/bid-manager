import { PptxMappingEditor } from '@/components/settings/pptx-mapping-editor'

export default async function PptxMappingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PptxMappingEditor templateId={id} />
}
