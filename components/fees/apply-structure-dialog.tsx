'use client'

import { useEffect, useState } from 'react'
import { feeService, type FeeStructure } from '@/lib/services/fee'
import { usersService, type UserListItem } from '@/lib/services/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Search, Users } from 'lucide-react'

interface ApplyStructureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  structure: FeeStructure | null
}

export function ApplyStructureDialog({ open, onOpenChange, structure }: ApplyStructureDialogProps) {
  const [mode, setMode] = useState<'all' | 'specific'>('all')
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState<UserListItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [result, setResult] = useState<{ applied: number; skipped: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setMode('all')
      setSearch('')
      setSelected(new Set())
      setResult(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'specific') return
    setIsLoadingStudents(true)
    usersService.list({ role: 'student', limit: 200, search: search || undefined }).then(res => {
      setStudents(res.data)
      setIsLoadingStudents(false)
    })
  }, [open, mode, search])

  const toggleStudent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApply = async () => {
    if (!structure) return
    setIsApplying(true)
    const studentIds = mode === 'specific' ? Array.from(selected) : undefined
    const res = await feeService.applyStructureToStudents(structure.id, studentIds)
    setIsApplying(false)
    setResult(res)
  }

  if (!structure) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply &quot;{structure.name}&quot;</DialogTitle>
          <DialogDescription>
            Assign this fee structure to students in {structure.className ?? 'this class'}.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <Alert>
              <AlertDescription>
                Applied to {result.applied} student{result.applied !== 1 ? 's' : ''}. Skipped {result.skipped}.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <RadioGroup value={mode} onValueChange={v => setMode(v as 'all' | 'specific')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="apply-all" />
                <Label htmlFor="apply-all">All students in {structure.className ?? 'this class'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="specific" id="apply-specific" />
                <Label htmlFor="apply-specific">Select specific students</Label>
              </div>
            </RadioGroup>

            {mode === 'specific' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                </div>
                <div className="rounded-md border max-h-64 overflow-y-auto divide-y">
                  {isLoadingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">No students found.</div>
                  ) : (
                    students.map(student => (
                      <label key={student.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={selected.has(student.id)} onCheckedChange={() => toggleStudent(student.id)} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{student.fullName}</div>
                          <div className="text-xs text-muted-foreground truncate">{student.userCode} · {student.email}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{selected.size} selected</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>Cancel</Button>
              <Button onClick={handleApply} disabled={isApplying || (mode === 'specific' && selected.size === 0)}>
                {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Users className="mr-2 h-4 w-4" />
                Apply
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
