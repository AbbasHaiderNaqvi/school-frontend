'use client'

import { useState, useEffect, useMemo } from 'react'
import { accessControlService, type PermissionGroup, type GroupDetail, type GroupPermission, type Permission } from '@/lib/services/access-control'
import { getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  ShieldCheck, Plus, Search, Copy, Pencil, Trash2, X, Loader2, Lock, MoreVertical, KeyRound,
} from 'lucide-react'

const PERM_PAGE_LIMIT = 20

export function AccessControlPanel() {
  const { toast } = useToast()

  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [groupSearch, setGroupSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [cloneTarget, setCloneTarget] = useState<PermissionGroup | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<PermissionGroup | null>(null)

  const [addPermOpen, setAddPermOpen] = useState(false)
  const [addingPermissionId, setAddingPermissionId] = useState<string | null>(null)
  const [permSearch, setPermSearch] = useState('')
  const [permPage, setPermPage] = useState(1)
  const [permTotal, setPermTotal] = useState(0)
  const [permResults, setPermResults] = useState<Permission[]>([])
  const [permLoading, setPermLoading] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    setLoadingDetail(true)
    accessControlService.getGroup(selectedId).then(d => {
      setDetail(d)
      setLoadingDetail(false)
    })
  }, [selectedId])

  useEffect(() => {
    if (!addPermOpen) return
    setPermLoading(true)
    accessControlService.listPermissions({ page: permPage, limit: PERM_PAGE_LIMIT, search: permSearch || undefined }).then(res => {
      setPermResults(res.data)
      setPermTotal(res.total)
      setPermLoading(false)
    })
  }, [addPermOpen, permPage, permSearch])

  const loadGroups = async () => {
    setLoadingGroups(true)
    const data = await accessControlService.getGroups()
    setGroups(data)
    setLoadingGroups(false)
  }

  const refreshDetail = async () => {
    if (!selectedId) return
    const d = await accessControlService.getGroup(selectedId)
    setDetail(d)
  }

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(g => g.name.toLowerCase().includes(q))
  }, [groups, groupSearch])

  // The API paginates permissions server-side, so "already assigned" is filtered
  // per fetched page rather than against the full catalog.
  const unassignedPermResults = useMemo(() => {
    const assignedIds = new Set((detail?.permissions || []).map(p => p.id))
    return permResults.filter(p => !assignedIds.has(p.id))
  }, [permResults, detail])

  const permissionsByModule = useMemo(() => {
    const byModule: Record<string, GroupPermission[]> = {}
    for (const p of detail?.permissions || []) {
      const mod = p.module || p.key.split('.')[0] || 'Other'
      if (!byModule[mod]) byModule[mod] = []
      byModule[mod].push(p)
    }
    return byModule
  }, [detail])

  const handleCreate = async () => {
    if (!createName.trim()) return
    setSaving(true)
    const { group, error } = await accessControlService.createGroup({ name: createName.trim(), description: createDesc.trim() || undefined })
    setSaving(false)
    if (error || !group) {
      toast({ title: 'Error', description: error || 'Failed to create group', variant: 'destructive' })
      return
    }
    toast({ title: 'Group created', description: `"${group.name}" is ready.` })
    setCreateOpen(false)
    setCreateName('')
    setCreateDesc('')
    await loadGroups()
    setSelectedId(group.id)
  }

  const openEdit = (g: PermissionGroup) => {
    setEditName(g.name)
    setEditDesc(g.description || '')
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!selectedId || !editName.trim()) return
    setSaving(true)
    const { group, error } = await accessControlService.updateGroup(selectedId, { name: editName.trim(), description: editDesc.trim() })
    setSaving(false)
    if (error || !group) {
      toast({ title: 'Error', description: error || 'Failed to update group', variant: 'destructive' })
      return
    }
    toast({ title: 'Group updated' })
    setEditOpen(false)
    await Promise.all([loadGroups(), refreshDetail()])
  }

  const openClone = (g: PermissionGroup) => {
    setCloneTarget(g)
    setCloneName(`${g.name} (Copy)`)
    setCloneOpen(true)
  }

  const handleClone = async () => {
    if (!cloneTarget || !cloneName.trim()) return
    setSaving(true)
    const { group, error } = await accessControlService.cloneGroup(cloneTarget.id, cloneName.trim())
    setSaving(false)
    if (error || !group) {
      toast({ title: 'Error', description: error || 'Failed to clone group', variant: 'destructive' })
      return
    }
    toast({ title: 'Group cloned', description: `Created "${group.name}".` })
    setCloneOpen(false)
    setCloneTarget(null)
    await loadGroups()
    setSelectedId(group.id)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    const { success, error } = await accessControlService.deleteGroup(deleteTarget.id)
    setSaving(false)
    if (!success) {
      toast({ title: 'Error', description: error || 'Failed to delete group', variant: 'destructive' })
      return
    }
    toast({ title: 'Group deleted' })
    if (selectedId === deleteTarget.id) setSelectedId(null)
    setDeleteTarget(null)
    await loadGroups()
  }

  const openAddPermission = () => {
    setPermSearch('')
    setPermPage(1)
    setAddPermOpen(true)
  }

  const handleAddPermission = async (permissionId: string) => {
    if (!selectedId) return
    setAddingPermissionId(permissionId)
    const { success, error } = await accessControlService.addPermissionToGroup(selectedId, permissionId, 'ALLOW')
    setAddingPermissionId(null)
    if (!success) {
      toast({ title: 'Error', description: error || 'Failed to add permission', variant: 'destructive' })
      return
    }
    setPermTotal(t => Math.max(0, t - 1))
    await refreshDetail()
  }

  const handleRemovePermission = async (permissionId: string) => {
    if (!selectedId) return
    setAddingPermissionId(permissionId)
    const { success, error } = await accessControlService.removePermissionFromGroup(selectedId, permissionId)
    setAddingPermissionId(null)
    if (!success) {
      toast({ title: 'Error', description: error || 'Failed to remove permission', variant: 'destructive' })
      return
    }
    await refreshDetail()
  }

  const handleEffectChange = async (permissionId: string, effect: 'ALLOW' | 'DENY') => {
    if (!selectedId) return
    setAddingPermissionId(permissionId)
    await accessControlService.removePermissionFromGroup(selectedId, permissionId)
    const { success, error } = await accessControlService.addPermissionToGroup(selectedId, permissionId, effect)
    setAddingPermissionId(null)
    if (!success) {
      toast({ title: 'Error', description: error || 'Failed to update permission', variant: 'destructive' })
    }
    await refreshDetail()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Create reusable permission groups, then assign them to users to control what they can see and do.
      </p>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Groups list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Groups</CardTitle>
                {!loadingGroups && <Badge variant="secondary">{groups.length}</Badge>}
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New
              </Button>
            </div>
            <div className="relative pt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {loadingGroups ? (
              <div className="space-y-1 px-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No groups found.</p>
            ) : (
              <div className="max-h-[560px] overflow-y-auto overflow-x-hidden pr-1">
                <div className="space-y-0.5">
                  {filteredGroups.map(g => {
                    const selected = selectedId === g.id
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedId(g.id)}
                        className={`group flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer border-l-2 transition-colors ${
                          selected ? 'bg-primary/8 border-l-primary' : 'border-l-transparent hover:bg-muted/60'
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className={selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}>
                            {getInitials(g.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{g.name}</span>
                            {g.isSystem && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {g.permissionCount} permission{g.permissionCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <span className="sr-only">Actions</span>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openClone(g)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Clone
                            </DropdownMenuItem>
                            {!g.isProtected && (
                              <DropdownMenuItem onClick={() => { setSelectedId(g.id); openEdit(g) }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                            )}
                            {!g.isProtected && !g.isSystem && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteTarget(g)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group detail */}
        <Card>
          {!selectedId ? (
            <CardContent className="py-6">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ShieldCheck />
                  </EmptyMedia>
                  <EmptyTitle>No group selected</EmptyTitle>
                  <EmptyDescription>Pick a group on the left to view and manage its permissions.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          ) : loadingDetail || !detail ? (
            <>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                        {getInitials(detail.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{detail.name}</CardTitle>
                        {detail.isSystem && <Badge variant="secondary">System</Badge>}
                        {detail.isProtected && <Badge variant="outline">Protected</Badge>}
                        {detail.isDefault && <Badge variant="outline">Default</Badge>}
                      </div>
                      <CardDescription className="mt-1">
                        {detail.description || 'No description provided.'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!detail.isProtected && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(detail)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon-sm">
                          <span className="sr-only">More actions</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openClone(detail)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        {!detail.isProtected && !detail.isSystem && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget(detail)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold">Assigned Permissions ({detail.permissions.length})</h4>
                  <Button size="sm" onClick={openAddPermission}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Permission
                  </Button>
                </div>

                {detail.permissions.length === 0 ? (
                  <Empty className="border rounded-lg py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <KeyRound />
                      </EmptyMedia>
                      <EmptyTitle>No permissions yet</EmptyTitle>
                      <EmptyDescription>Add permissions to define what this group can access.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Accordion type="multiple" defaultValue={Object.keys(permissionsByModule)} className="space-y-2">
                    {Object.entries(permissionsByModule).map(([mod, perms]) => (
                      <AccordionItem key={mod} value={mod} className="border rounded-lg px-3 last:border-b">
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <span className="flex items-center gap-2 text-sm font-medium capitalize">
                            {mod.replace(/_/g, ' ')}
                            <Badge variant="secondary" className="font-normal no-underline">{perms.length}</Badge>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1.5 pb-2">
                            {perms.map(p => (
                              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{p.name}</div>
                                  <div className="text-xs text-muted-foreground truncate font-mono">{p.key}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Select
                                    value={p.effect}
                                    disabled={addingPermissionId === p.id}
                                    onValueChange={v => handleEffectChange(p.id, v as 'ALLOW' | 'DENY')}
                                  >
                                    <SelectTrigger
                                      className={`h-7 w-24 text-xs font-medium ${
                                        p.effect === 'ALLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                                      }`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ALLOW">Allow</SelectItem>
                                      <SelectItem value="DENY">Deny</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={addingPermissionId === p.id}
                                    onClick={() => handleRemovePermission(p.id)}
                                  >
                                    {addingPermissionId === p.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <X className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Create group dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Permission Group</DialogTitle>
            <DialogDescription>Create a reusable set of permissions you can assign to users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input id="group-name" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Finance Read Only" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-desc">Description</Label>
              <Input id="group-desc" value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Read-only access to finance reports and GL accounts." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !createName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit group dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input id="edit-desc" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone group dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone "{cloneTarget?.name}"</DialogTitle>
            <DialogDescription>Creates a new, editable group with the same permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="clone-name">New group name</Label>
            <Input id="clone-name" value={cloneName} onChange={e => setCloneName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>Cancel</Button>
            <Button onClick={handleClone} disabled={saving || !cloneName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add permission dialog */}
      <Dialog open={addPermOpen} onOpenChange={setAddPermOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Permission</DialogTitle>
            <DialogDescription>Search the permission catalog and add what this group needs.</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or key..."
              value={permSearch}
              onChange={e => { setPermSearch(e.target.value); setPermPage(1) }}
              className="pl-8"
            />
          </div>

          <div className="border rounded-lg divide-y max-h-[360px] overflow-y-auto">
            {permLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-7 w-9" />
                  </div>
                ))}
              </div>
            ) : unassignedPermResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No matching permissions.</p>
            ) : (
              unassignedPermResults.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">{p.key}</div>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    disabled={addingPermissionId === p.id}
                    onClick={() => handleAddPermission(p.id)}
                  >
                    {addingPermissionId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>

          {permTotal > PERM_PAGE_LIMIT && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Showing {(permPage - 1) * PERM_PAGE_LIMIT + 1}–{Math.min(permPage * PERM_PAGE_LIMIT, permTotal)} of {permTotal}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={permPage === 1} onClick={() => setPermPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={permPage * PERM_PAGE_LIMIT >= permTotal} onClick={() => setPermPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the group. Any users assigned to it will lose the permissions it grants. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
