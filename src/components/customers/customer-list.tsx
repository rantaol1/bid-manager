'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorMessage } from '@/components/common/error-message'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { useCustomers, useDeleteCustomer, type CustomerDTO } from '@/hooks/use-customers'

interface Props {
  initialData: { data: CustomerDTO[]; pagination: { page: number; limit: number; total: number; pages: number } }
}

export function CustomerList({ initialData }: Props) {
  const [search, setSearch] = useState('')
  const { data, isLoading, error } = useCustomers(search, initialData)
  const deleteMutation = useDeleteCustomer()

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Customer deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete customer')
    }
  }

  const customers = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <CustomerFormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              New customer
            </Button>
          }
        />
      </div>

      {error ? (
        <ErrorMessage message="Failed to load customers" />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : customers.length === 0 ? (
        <EmptyState
          message={search ? 'No customers match your search' : 'No customers yet'}
          hint={search ? 'Try a different search term.' : 'Create your first customer to get started.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Opportunities</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/customers/${c.id}`} className="hover:text-magenta">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.industry || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.country || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contactName || '—'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{c._count?.opportunities ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <CustomerFormDialog
                        customer={c}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Edit customer">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title="Delete customer?"
                        description={`This will permanently delete ${c.name}. Customers with opportunities cannot be deleted.`}
                        confirmLabel="Delete"
                        onConfirm={() => handleDelete(c.id)}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Delete customer">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
