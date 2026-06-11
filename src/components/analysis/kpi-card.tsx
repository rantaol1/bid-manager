import { Card, CardContent } from '@/components/ui/card'
import { RagIndicator } from '@/components/analysis/rag-indicator'
import type { RagStatus } from '@/lib/constants/benchmarks'

/** A labelled stat card with an optional sub-label and RAG status dot. */
export function KpiCard({
  label,
  value,
  sublabel,
  rag,
}: {
  label: string
  value: string
  sublabel?: string
  rag?: RagStatus
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {rag && <RagIndicator status={rag} />}
        </div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {sublabel && <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  )
}
