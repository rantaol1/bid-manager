'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/common/empty-state'
import { TeamPanel } from '@/components/opportunity/team-panel'
import { formatCurrency } from '@/lib/utils'
import { STAGES, type StageId } from '@/lib/constants/stages'
import { useChangeStage } from '@/hooks/use-opportunities'
import type { OpportunityDetailDTO } from '@/hooks/use-opportunity'

export function OverviewTab({ opportunity }: { opportunity: OpportunityDetailDTO }) {
  const changeStage = useChangeStage()

  async function onStageChange(stage: string | null) {
    if (!stage) return
    try {
      await changeStage.mutateAsync({ id: opportunity.id, stage: stage as StageId })
      toast.success('Stage updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update stage')
    }
  }

  const facts: Array<[string, string]> = [
    [
      'Expected value',
      opportunity.expectedValue ? formatCurrency(Number(opportunity.expectedValue), opportunity.currency) : '—',
    ],
    ['Probability', opportunity.probability != null ? `${opportunity.probability}%` : '—'],
    ['Close date', opportunity.closeDate ? new Date(opportunity.closeDate).toLocaleDateString('en-IE') : '—'],
    ['Deliverables', String(opportunity._count.deliverables)],
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([label, value]) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label>Stage</Label>
              <Select value={opportunity.stage} onValueChange={onStageChange}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Link href={`/customers/${opportunity.customer.id}`} className="hover:text-magenta">
                {opportunity.customer.name}
              </Link>
              {opportunity.customer.industry && (
                <span className="text-muted-foreground">· {opportunity.customer.industry}</span>
              )}
            </div>

            {opportunity.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {opportunity.tags.map((tag) => (
                  <span key={tag} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {opportunity.notes && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap text-sm">{opportunity.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {opportunity.activities.length === 0 ? (
              <EmptyState message="No activity yet" />
            ) : (
              <ul className="space-y-3">
                {opportunity.activities.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 text-sm">
                    <span>{a.description}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardContent className="pt-6">
            <TeamPanel opportunityId={opportunity.id} initialTeam={opportunity.teamMembers} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
