import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { OpportunityForm } from '@/components/opportunity/opportunity-form'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function NewOpportunityPage() {
  await requireAuth()
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <PageShell
      title="New opportunity"
      description="Create an opportunity for a customer."
      actions={
        <Button variant="outline" render={<Link href="/pipeline" />}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      }
    >
      {customers.length === 0 ? (
        <EmptyState
          message="No customers yet"
          hint="Create a customer first, then add opportunities for them."
          action={
            <Button render={<Link href="/customers" />}>Go to customers</Button>
          }
        />
      ) : (
        <OpportunityForm customers={customers} />
      )}
    </PageShell>
  )
}
