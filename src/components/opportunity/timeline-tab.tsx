'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage } from '@/components/common/error-message'
import { GoLiveManager } from '@/components/timeline/go-live-manager'
import { useRollouts, useEstimationMutations, useTimelineConfig } from '@/hooks/use-estimation'
import { useProposalData } from '@/hooks/use-proposal-data'
import { SectionPreview } from '@/components/preview/section-preview'
import { PreviewPanel } from '@/components/preview/preview-panel'

// Roadmap relies on browser-only APIs (html-to-image) — load client-side only.
const RoadmapBuilder = dynamic(
  () => import('@/components/timeline/roadmap-builder').then((m) => m.RoadmapBuilder),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> }
)

export function TimelineTab({ opportunityId }: { opportunityId: string }) {
  const { data: rollouts, isLoading, error } = useRollouts(opportunityId)
  const { data: timelineConfig } = useTimelineConfig(opportunityId)
  const mutations = useEstimationMutations(opportunityId)
  const { data: proposalData } = useProposalData(opportunityId)

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (error) return <ErrorMessage message="Failed to load timeline data" />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <RoadmapBuilder
            rollouts={rollouts ?? []}
            onUpdatePhase={(input) => mutations.updatePhase.mutateAsync(input)}
            onDeletePhase={(phaseId) => mutations.deletePhase.mutateAsync(phaseId)}
            groups={timelineConfig?.groups ?? []}
            onSaveGroups={(groups) =>
              mutations.saveTimelineConfig.mutateAsync({ ...timelineConfig, groups })
            }
            background={timelineConfig?.background}
            onUpdateBackground={(background) =>
              mutations.saveTimelineConfig.mutateAsync({ ...timelineConfig, background })
            }
            goLiveOffsets={timelineConfig?.goLiveOffsets ?? {}}
            onSaveGoLiveOffsets={(goLiveOffsets) =>
              mutations.saveTimelineConfig.mutateAsync({ ...timelineConfig, goLiveOffsets })
            }
          />
        </CardContent>
      </Card>

      <GoLiveManager rollouts={rollouts ?? []} mutations={mutations} />

      {proposalData && (
        <Card>
          <CardHeader>
            <CardTitle>Slide preview</CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewPanel label="Plan slide">
              <SectionPreview sectionId="plan" data={proposalData} />
            </PreviewPanel>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
