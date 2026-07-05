'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  accessControlService, type PermissionGroup, type UserGroupAssignment,
} from '@/lib/services/access-control'
import type { UserListItem } from '@/lib/services/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { X, Loader2, CalendarClock } from 'lucide-react'

interface ManageUserGroupsDialogProps {
  user: UserListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const toStartIso = (date: string) => (date ? `${date}T00:00:00Z` : undefined)
const toEndIso = (date: string) => (date ? `${date}T23:59:59Z` : undefined)

export function ManageUserGroupsDialog({ user, open, onOpenChange }: ManageUserGroupsDialogProps) {
  const { toast } = useToast()

  const [assignments, setAssignments] = useState<UserGroupAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<PermissionGroup[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [roleId, setRoleId] = useState('')
  const [scopeType, setScopeType] = useState('')
  const [scopeId, setScopeId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [reason, setReason] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    resetForm()
    loadAssignments()
    if (roles.length === 0) accessControlService.getGroups().then(setRoles)
  }, [open, user])

  const resetForm = () => {
    setRoleId('')
    setScopeType('')
    setScopeId('')
    setStartsAt('')
    setExpiresAt('')
    setReason('')
  }

  const loadAssignments = async () => {
    if (!user) return
    setLoading(true)
    const data = await accessControlService.getUserGroups(user.id)
    setAssignments(data)
    setLoading(false)
  }

  const assignableRoles = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.id))
    return roles.filter(r => !assignedIds.has(r.id))
  }, [roles, assignments])

  const handleAssign = async () => {
    if (!user || !roleId) return
    setAssigning(true)
    const { success, error } = await accessControlService.assignGroupToUser(user.id, {
      groupId: roleId,
      scopeType: scopeType.trim() || undefined,
      scopeId: scopeId.trim() || undefined,
      startsAt: toStartIso(startsAt),
      expiresAt: toEndIso(expiresAt),
      reason: reason.trim() || undefined,
    })
    setAssigning(false)
    if (!success) {
      toast({ title: 'Error', description: error || 'Failed to assign role', variant: 'destructive' })
      return
    }
    toast({ title: 'Role assigned' })
    resetForm()
    await loadAssignments()
  }

  const handleRemove = async (assignment: UserGroupAssignment) => {
    if (!user) return
    if (!confirm(`Remove "${assignment.name}" from ${user.fullName}?`)) return
    setRemovingId(assignment.id)
    const { success, error } = await accessControlService.removeGroupFromUser(user.id, assignment.id)
    setRemovingId(null)
    if (!success) {
      toast({ title: 'Error', description: error || 'Failed to remove role', variant: 'destructive' })
      return
    }
    toast({ title: 'Role removed' })
    await loadAssignments()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Assign or remove roles for <span className="font-medium text-foreground">{user?.fullName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Roles</Label>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
              No roles assigned yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    {(a.scopeType || a.expiresAt) && (
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 mt-0.5">
                        {a.scopeType && <span>Scope: {a.scopeType}{a.scopeId ? ` (${a.scopeId})` : ''}</span>}
                        {a.expiresAt && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            Expires {new Date(a.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={removingId === a.id}
                    onClick={() => handleRemove(a)}
                  >
                    {removingId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium">Assign a Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role..." />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Scope type (optional)</Label>
              <Input value={scopeType} onChange={e => setScopeType(e.target.value)} placeholder="e.g. campus" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Scope ID (optional)</Label>
              <Input value={scopeId} onChange={e => setScopeId(e.target.value)} placeholder="Campus ID" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Starts (optional)</Label>
              <Input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Expires (optional)</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Covering for Sana on maternity leave" />
          </div>

          <Button onClick={handleAssign} disabled={!roleId || assigning} className="w-full">
            {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Role
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
