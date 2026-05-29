'use client'

import Link from 'next/link'
import { Plus, KanbanSquare, TableProperties } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorMessage } from '@/components/common/error-message'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { PipelineTable } from '@/components/pipeline/pipeline-table'
import { useOpportunities, type OpportunityDTO } from '@/hooks/use-opportunities'

interface Props {
  initialData: { data: OpportunityDTO[]; pagination: { page: number; limit: number; total: number; pages: number } }
}

export function PipelineView({ initialData }: Props) {
  const { data, isLoading, error } = useOpportunities(initialData)
  const opportunities = data?.data ?? []

  return (
    <Tabs defaultValue="board" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="board">
            <KanbanSquare className="h-4 w-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="table">
            <TableProperties className="h-4 w-4" />
            Table
          </TabsTrigger>
        </TabsList>
        <Button render={<Link href="/opportunities/new" />}>
          <Plus className="h-4 w-4" />
          New opportunity
        </Button>
      </div>

      {error ? (
        <ErrorMessage message="Failed to load opportunities" />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : opportunities.length === 0 ? (
        <EmptyState
          message="No opportunities yet"
          hint="Create your first opportunity to start building your pipeline."
          action={<Button render={<Link href="/opportunities/new" />}>New opportunity</Button>}
        />
      ) : (
        <>
          <TabsContent value="board">
            <KanbanBoard opportunities={opportunities} />
          </TabsContent>
          <TabsContent value="table">
            <PipelineTable opportunities={opportunities} />
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}
