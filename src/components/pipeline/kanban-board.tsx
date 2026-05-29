'use client'

import { useMemo, useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import { STAGES, type StageId } from '@/lib/constants/stages'
import { StageColumn } from '@/components/pipeline/stage-column'
import { useChangeStage, type OpportunityDTO } from '@/hooks/use-opportunities'

function groupByStage(opportunities: OpportunityDTO[]): Record<string, OpportunityDTO[]> {
  const groups: Record<string, OpportunityDTO[]> = {}
  for (const stage of STAGES) groups[stage.id] = []
  for (const opp of opportunities) {
    ;(groups[opp.stage] ??= []).push(opp)
  }
  return groups
}

export function KanbanBoard({ opportunities }: { opportunities: OpportunityDTO[] }) {
  const changeStage = useChangeStage()

  // Re-sync local board state whenever the upstream query data changes (render-phase reset).
  const [prevOpps, setPrevOpps] = useState(opportunities)
  const [columns, setColumns] = useState(() => groupByStage(opportunities))
  if (opportunities !== prevOpps) {
    setPrevOpps(opportunities)
    setColumns(groupByStage(opportunities))
  }

  const stageList = useMemo(() => STAGES, [])

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const fromStage = source.droppableId
    const toStage = destination.droppableId as StageId

    // Optimistic move
    setColumns((prev) => {
      const next = { ...prev, [fromStage]: [...prev[fromStage]], [toStage]: [...prev[toStage]] }
      const [moved] = next[fromStage].splice(source.index, 1)
      if (!moved) return prev
      const updated = { ...moved, stage: toStage }
      next[toStage].splice(destination.index, 0, updated)
      return next
    })

    if (fromStage !== toStage) {
      changeStage.mutate(
        { id: draggableId, stage: toStage },
        {
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Failed to update stage')
            setColumns(groupByStage(opportunities))
          },
        }
      )
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stageList.map((stage) => (
          <StageColumn key={stage.id} stage={stage} opportunities={columns[stage.id] ?? []} />
        ))}
      </div>
    </DragDropContext>
  )
}
