'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { getStage } from '@/lib/constants/stages'
import type { OpportunityDTO } from '@/hooks/use-opportunities'

export function PipelineTable({ opportunities }: { opportunities: OpportunityDTO[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState('')

  const columns = useMemo<ColumnDef<OpportunityDTO>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Name <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <Link href={`/opportunities/${row.original.id}`} className="font-medium hover:text-magenta">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'customer',
        accessorFn: (row) => row.customer.name,
        header: 'Customer',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.customer.name}</span>,
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ row }) => {
          const stage = getStage(row.original.stage)
          return stage ? (
            <Badge style={{ backgroundColor: stage.colour }} className="text-white">
              {stage.label}
            </Badge>
          ) : (
            row.original.stage
          )
        },
      },
      {
        accessorKey: 'expectedValue',
        sortingFn: (a, b) =>
          Number(a.original.expectedValue ?? 0) - Number(b.original.expectedValue ?? 0),
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Value <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) =>
          row.original.expectedValue
            ? formatCurrency(Number(row.original.expectedValue), row.original.currency)
            : '—',
      },
      {
        accessorKey: 'probability',
        header: 'Prob.',
        cell: ({ row }) => (row.original.probability != null ? `${row.original.probability}%` : '—'),
      },
      {
        accessorKey: 'closeDate',
        header: 'Close date',
        cell: ({ row }) =>
          row.original.closeDate ? new Date(row.original.closeDate).toLocaleDateString('en-IE') : '—',
      },
    ],
    []
  )

  const table = useReactTable({
    data: opportunities,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter opportunities…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No opportunities found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
