import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { getStage } from '@/lib/constants/stages'
import type { CustomerDTO } from '@/hooks/use-customers'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      opportunities: {
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, stage: true, expectedValue: true, currency: true, updatedAt: true },
      },
    },
  })

  if (!customer) notFound()

  const dto: CustomerDTO = {
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  }

  const details: Array<[string, string | null]> = [
    ['Industry', customer.industry],
    ['Country', customer.country],
    ['Contact name', customer.contactName],
    ['Contact email', customer.contactEmail],
    ['Contact phone', customer.contactPhone],
  ]

  return (
    <PageShell
      title={customer.name}
      description={customer.industry ?? undefined}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/customers" />}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <CustomerFormDialog
            customer={dto}
            trigger={
              <Button>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            }
          />
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium">{value || '—'}</span>
              </div>
            ))}
            {customer.notes && (
              <div className="border-t pt-3">
                <p className="mb-1 text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Opportunities ({customer.opportunities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.opportunities.length === 0 ? (
              <EmptyState message="No opportunities yet" hint="Create one from the Pipeline." />
            ) : (
              <div className="divide-y">
                {customer.opportunities.map((opp) => {
                  const stage = getStage(opp.stage)
                  return (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.id}`}
                      className="flex items-center justify-between gap-4 py-3 hover:text-magenta"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{opp.name}</span>
                        {stage && (
                          <Badge style={{ backgroundColor: stage.colour }} className="text-white">
                            {stage.label}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {opp.expectedValue
                          ? formatCurrency(Number(opp.expectedValue), opp.currency)
                          : '—'}
                      </span>
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
