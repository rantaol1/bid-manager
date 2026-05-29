'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import {
  useTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  type TeamMemberDTO,
} from '@/hooks/use-opportunity'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function TeamPanel({ opportunityId, initialTeam }: { opportunityId: string; initialTeam: TeamMemberDTO[] }) {
  const { data: team } = useTeam(opportunityId, initialTeam)
  const addMember = useAddTeamMember(opportunityId)
  const removeMember = useRemoveTeamMember(opportunityId)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ userName: '', userEmail: '', role: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.userName.trim()) next.userName = 'Name is required'
    if (!form.role.trim()) next.role = 'Role is required'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    try {
      await addMember.mutateAsync(form)
      toast.success('Team member added')
      setForm({ userName: '', userEmail: '', role: '' })
      setErrors({})
      setOpen(false)
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to add member' })
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember.mutateAsync(memberId)
      toast.success('Team member removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const members = team ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Team ({members.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="grid gap-4">
              <div>
                <Label htmlFor="member-name">Name</Label>
                <Input
                  id="member-name"
                  value={form.userName}
                  onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
                  className="mt-1"
                />
                {errors.userName && <p className="mt-1 text-sm text-destructive">{errors.userName}</p>}
              </div>
              <div>
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={form.userEmail}
                  onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="member-role">Project role</Label>
                <Input
                  id="member-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g. Solution Architect"
                />
                {errors.role && <p className="mt-1 text-sm text-destructive">{errors.role}</p>}
              </div>
              {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
              <DialogFooter>
                <Button type="submit" disabled={addMember.isPending}>
                  <UserPlus className="h-4 w-4" />
                  {addMember.isPending ? 'Adding…' : 'Add member'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {members.length === 0 ? (
        <EmptyState message="No team members" hint="Add consultants working this opportunity." />
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials(m.userName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{m.userName}</p>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                </div>
              </div>
              <ConfirmDialog
                title="Remove team member?"
                description={`Remove ${m.userName} from this opportunity.`}
                confirmLabel="Remove"
                onConfirm={() => handleRemove(m.id)}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Remove member">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
