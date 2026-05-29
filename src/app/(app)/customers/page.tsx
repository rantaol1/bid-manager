import { PageShell } from '@/components/layout/page-shell'
import { CustomerList } from '@/components/customers/customer-list'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { CustomerDTO } from '@/hooks/use-customers'

export default async function CustomersPage() {
  await requireAuth()

  const limit = 100
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      take: limit,
      orderBy: { name: 'asc' },
      include: { _count: { select: { opportunities: true } } },
    }),
    prisma.customer.count(),
  ])

  const data: CustomerDTO[] = rows.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return (
    <PageShell title="Customers" description="Prospects and customers in your pipeline.">
      <CustomerList
        initialData={{ data, pagination: { page: 1, limit, total, pages: Math.ceil(total / limit) } }}
      />
    </PageShell>
  )
}
