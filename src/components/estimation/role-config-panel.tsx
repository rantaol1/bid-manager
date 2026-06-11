'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Save } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RoleConfigDTO } from '@/hooks/use-estimation'

interface EditableRole {
  id?: string
  roleName: string
  rate: string
  costRate: string
  sortOrder: number
}

interface Props {
  roles: RoleConfigDTO[]
  saving: boolean
  onSave: (
    roles: { id?: string; roleName: string; rate: number; costRate: number; sortOrder: number }[]
  ) => Promise<void>
}

export function RoleConfigPanel({ roles, saving, onSave }: Props) {
  const toRows = (source: RoleConfigDTO[]): EditableRole[] =>
    source.map((r) => ({
      id: r.id,
      roleName: r.roleName,
      // Coerce to a string so the inputs stay controlled even if the API omits a field.
      rate: r.rate ?? '',
      costRate: r.costRate ?? '',
      sortOrder: r.sortOrder,
    }))

  // Reset the editable rows when the server roles change (render-phase reset).
  const [prevRoles, setPrevRoles] = useState(roles)
  const [rows, setRows] = useState<EditableRole[]>(() => toRows(roles))
  if (roles !== prevRoles) {
    setPrevRoles(roles)
    setRows(toRows(roles))
  }

  function update(index: number, key: keyof EditableRole, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { roleName: '', rate: '1000', costRate: '600', sortOrder: prev.length }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    const cleaned = rows
      .filter((r) => r.roleName.trim())
      .map((r, i) => ({
        id: r.id,
        roleName: r.roleName.trim(),
        rate: Number(r.rate) || 0,
        costRate: Number(r.costRate) || 0,
        sortOrder: i,
      }))
    try {
      await onSave(cleaned)
      toast.success('Roles saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save roles')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Roles & rates</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add role
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead className="w-32">Bill rate (/day)</TableHead>
              <TableHead className="w-32">Cost rate (/day)</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id ?? `new-${i}`}>
                <TableCell>
                  <Input value={row.roleName} onChange={(e) => update(i, 'roleName', e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={row.rate}
                    onChange={(e) => update(i, 'rate', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={row.costRate}
                    onChange={(e) => update(i, 'costRate', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeRow(i)} aria-label="Remove role">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
