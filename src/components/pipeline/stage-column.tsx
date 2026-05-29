'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import { OpportunityCard } from '@/components/pipeline/opportunity-card'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { OpportunityDTO } from '@/hooks/use-opportunities'

interface StageColumnProps {
  stage: { id: string; label: string; colour: string }
  opportunities: OpportunityDTO[]
}

export function StageColumn({ stage, opportunities }: StageColumnProps) {
  const total = opportunities.reduce((sum, o) => sum + (o.expectedValue ? Number(o.expectedValue) : 0), 0)

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.colour }} />
          <span className="text-sm font-semibold">{stage.label}</span>
          <span className="text-xs text-muted-foreground">{opportunities.length}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatCurrency(total)}</span>
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex min-h-24 flex-1 flex-col gap-2 p-2 transition-colors',
              snapshot.isDraggingOver && 'bg-magenta/5'
            )}
          >
            {opportunities.map((opp, index) => (
              <Draggable key={opp.id} draggableId={opp.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={cn(dragSnapshot.isDragging && 'opacity-90')}
                  >
                    <OpportunityCard opportunity={opp} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
