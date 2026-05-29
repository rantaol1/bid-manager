import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { PipelineChart, type StageDatum } from '@/components/dashboard/pipeline-chart'
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/activity-feed'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { STAGES, getStage } from '@/lib/constants/stages'

const OPEN_STAGES = ['lead', 'qualified', 'scoping', 'proposal', 'submitted']

export default async function DashboardPage() {
  const userId = await requireAuth()

  const [byStage, totals, myOpps, activities] = await Promise.all([
    prisma.opportunity.groupBy({
      by: ['stage'],
      _sum: { expectedValue: true },
      _count: { _all: true },
    }),
    prisma.opportunity.aggregate({ _sum: { expectedValue: true }, _avg: { probability: true } }),
    prisma.opportunity.findMany({
      where: { createdBy: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { opportunity: { select: { id: true, name: true } } },
    }),
  ])

  const stageMap = new Map(byStage.map((s) => [s.stage, s]))
  const chartData: StageDatum[] = STAGES.map((stage) => ({
    label: stage.label,
    colour: stage.colour,
    value: Number(stageMap.get(stage.id)?._sum.expectedValue ?? 0),
    count: stageMap.get(stage.id)?._count._all ?? 0,
  }))

  const totalValue = Number(totals._sum.expectedValue ?? 0)
  const openValue = byStage
    .filter((s) => OPEN_STAGES.includes(s.stage))
    .reduce((sum, s) => sum + Number(s._sum.expectedValue ?? 0), 0)
  const wonValue = Number(stageMap.get('won')?._sum.expectedValue ?? 0)
  const openCount = byStage
    .filter((s) => OPEN_STAGES.includes(s.stage))
    .reduce((sum, s) => sum + s._count._all, 0)
  const avgProbability = totals._avg.probability ? Math.round(totals._avg.probability) : 0

  const activityItems: ActivityItem[] = activities.map((a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
    opportunity: a.opportunity,
  }))

  const stats = [
    { label: 'Total pipeline value', value: formatCurrency(totalValue) },
    { label: 'Open value', value: formatCurrency(openValue) },
    { label: 'Won value', value: formatCurrency(wonValue) },
    { label: 'Open opportunities', value: String(openCount) },
    { label: 'Avg. probability', value: `${avgProbability}%` },
  ]

  return (
    <PageShell
      title="Dashboard"
      description="Pipeline overview and recent activity."
      actions={
        <Button render={<Link href="/opportunities/new" />}>
          <Plus className="h-4 w-4" />
          New opportunity
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pipeline value by stage</CardTitle>
            </CardHeader>
            <CardContent>
              {totalValue === 0 ? (
                <EmptyState message="No pipeline value yet" hint="Add expected values to your opportunities." />
              ) : (
                <PipelineChart data={chartData} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={activityItems} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {myOpps.length === 0 ? (
              <EmptyState
                message="You have no opportunities yet"
                hint="Create one to see it here."
              />
            ) : (
              <div className="divide-y">
                {myOpps.map((opp) => {
                  const stage = getStage(opp.stage)
                  return (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.id}`}
                      className="flex items-center justify-between gap-4 py-3 hover:text-magenta"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{opp.name}</span>
                        <span className="text-sm text-muted-foreground">{opp.customer.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {stage && (
                          <Badge style={{ backgroundColor: stage.colour }} className="text-white">
                            {stage.label}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {opp.expectedValue ? formatCurrency(Number(opp.expectedValue), opp.currency) : '—'}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
