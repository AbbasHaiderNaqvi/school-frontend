'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { parentService, type Parent, type CreateParentRequest } from '@/lib/services/parent'
import { emailError, phoneError, requiredError, hasNoErrors } from '@/lib/validation'
import { Loader2 } from 'lucide-react'

const EMPTY_FORM: CreateParentRequest = {
  firstName: '', lastName: '', email: '', phone: '', cnic: '', occupation: '', address: '', isEmergencyContact: false,
}

interface ParentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Parent | null
  onSaved: (parent: Parent) => void
}

export function ParentFormDialog({ open, onOpenChange, editing, onSaved }: ParentFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        firstName: editing.firstName,
        lastName: editing.lastName,
        email: editing.email,
        phone: editing.phone,
        cnic: editing.cnic ?? '',
        occupation: editing.occupation ?? '',
        address: editing.address ?? '',
        isEmergencyContact: !!editing.isEmergencyContact,
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError('')
    setFieldErrors({})
  }, [open, editing])

  const isValid = form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.phone.trim()

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const firstNameErr = requiredError(form.firstName, 'First name')
    if (firstNameErr) errors.firstName = firstNameErr
    const lastNameErr = requiredError(form.lastName, 'Last name')
    if (lastNameErr) errors.lastName = lastNameErr
    const emailErr = emailError(form.email)
    if (emailErr) errors.email = emailErr
    const phoneErr = phoneError(form.phone)
    if (phoneErr) errors.phone = phoneErr
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!isValid || !validate()) return
    setIsSubmitting(true)
    setError('')

    const payload: CreateParentRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      cnic: form.cnic?.trim() || undefined,
      occupation: form.occupation?.trim() || undefined,
      address: form.address?.trim() || undefined,
      isEmergencyContact: form.isEmergencyContact,
    }

    const result = editing
      ? await parentService.updateParent(editing.id, payload)
      : await parentService.createParent(payload)

    setIsSubmitting(false)
    if (result.error || !result.data) {
      setError(result.error || 'Operation failed')
      return
    }
    onSaved(result.data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Parent' : 'Add Parent'}</DialogTitle>
          <DialogDescription>
            {editing ? `Update details for ${editing.firstName} ${editing.lastName}` : 'Create a new parent/guardian account'}
          </DialogDescription>
        </DialogHeader>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className={`mt-1 ${fieldErrors.firstName ? 'border-destructive' : ''}`}
              />
              {fieldErrors.firstName && <p className="text-xs text-destructive mt-1">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className={`mt-1 ${fieldErrors.lastName ? 'border-destructive' : ''}`}
              />
              {fieldErrors.lastName && <p className="text-xs text-destructive mt-1">{fieldErrors.lastName}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={`mt-1 ${fieldErrors.email ? 'border-destructive' : ''}`}
              />
              {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+923001234567"
                className={`mt-1 ${fieldErrors.phone ? 'border-destructive' : ''}`}
              />
              {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>CNIC (optional)</Label>
              <Input value={form.cnic} onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))} placeholder="42201-1234567-8" className="mt-1" />
            </div>
            <div>
              <Label>Occupation (optional)</Label>
              <Input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Address (optional)</Label>
            <Textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Emergency Contact</Label>
            <Switch checked={!!form.isEmergencyContact} onCheckedChange={checked => setForm(f => ({ ...f, isEmergencyContact: checked }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting || !isValid}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? 'Save Changes' : 'Create Parent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
