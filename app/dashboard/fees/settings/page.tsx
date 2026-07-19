'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { feeService, type FeeSettings, type LateFeeType } from '@/lib/services/fee'
import { financeService, type GlAccount } from '@/lib/services/finance'
import { numberError, requiredError, hasNoErrors } from '@/lib/validation'
import { Loader2, Save, Receipt, AlarmClock, Wallet, Landmark } from 'lucide-react'
import { FormPageSkeleton } from '@/components/ui/page-skeleton'

const NONE = '__none__'

interface FormState {
  receiptPrefix: string
  invoicePrefix: string
  defaultDueDay: string
  lateFeeEnabled: boolean
  lateFeeType: LateFeeType
  lateFeeAmount: string
  lateFeeApplyAfterDays: string
  maxLateFee: string
  autoMarkOverdue: boolean
  allowPartialPayment: boolean
  allowAdvancePayment: boolean
  financeIntegrationEnabled: boolean
  defaultCashAccountId: string
  defaultBankAccountId: string
  defaultFeeIncomeAccountId: string
  defaultReceivableAccountId: string
}

const DEFAULT_FORM: FormState = {
  receiptPrefix: 'FEE-RCP',
  invoicePrefix: 'FEE-INV',
  defaultDueDay: '10',
  lateFeeEnabled: false,
  lateFeeType: 'FIXED',
  lateFeeAmount: '',
  lateFeeApplyAfterDays: '7',
  maxLateFee: '',
  autoMarkOverdue: true,
  allowPartialPayment: true,
  allowAdvancePayment: false,
  financeIntegrationEnabled: false,
  defaultCashAccountId: '',
  defaultBankAccountId: '',
  defaultFeeIncomeAccountId: '',
  defaultReceivableAccountId: '',
}

function settingsToForm(s: FeeSettings): FormState {
  return {
    receiptPrefix: s.receiptPrefix ?? 'FEE-RCP',
    invoicePrefix: s.invoicePrefix ?? 'FEE-INV',
    defaultDueDay: String(s.defaultDueDay ?? 10),
    lateFeeEnabled: !!s.lateFeeEnabled,
    lateFeeType: s.lateFeeType ?? 'FIXED',
    lateFeeAmount: s.lateFeeAmount ?? '',
    lateFeeApplyAfterDays: String(s.lateFeeApplyAfterDays ?? 7),
    maxLateFee: s.maxLateFee ?? '',
    autoMarkOverdue: !!s.autoMarkOverdue,
    allowPartialPayment: !!s.allowPartialPayment,
    allowAdvancePayment: !!s.allowAdvancePayment,
    financeIntegrationEnabled: !!s.financeIntegrationEnabled,
    defaultCashAccountId: s.defaultCashAccountId ?? '',
    defaultBankAccountId: s.defaultBankAccountId ?? '',
    defaultFeeIncomeAccountId: s.defaultFeeIncomeAccountId ?? '',
    defaultReceivableAccountId: s.defaultReceivableAccountId ?? '',
  }
}

export default function FeeSettingsPage() {
  const { can } = useAuth()
  const canUpdate = can('fees.settings.update')

  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [settings, accounts] = await Promise.all([
        feeService.getSettings().catch(() => null),
        financeService.getGLAccounts({ isActive: true }).catch(() => []),
      ])
      if (settings) setForm(settingsToForm(settings))
      setGlAccounts(accounts)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load fee settings.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (!can('fees.settings.read')) return <AccessDenied />

  if (isLoading) return <FormPageSkeleton sections={4} />

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const receiptErr = requiredError(form.receiptPrefix, 'Receipt prefix')
    if (receiptErr) errors.receiptPrefix = receiptErr
    const invoiceErr = requiredError(form.invoicePrefix, 'Invoice prefix')
    if (invoiceErr) errors.invoicePrefix = invoiceErr
    const dueDayErr = numberError(form.defaultDueDay, { required: true, min: 1, max: 31, label: 'Default due day' })
    if (dueDayErr) errors.defaultDueDay = dueDayErr
    if (form.lateFeeEnabled) {
      const amountErr = numberError(form.lateFeeAmount, { required: true, min: 0.01, label: form.lateFeeType === 'PERCENTAGE' ? 'Late fee percentage' : 'Late fee amount' })
      if (amountErr) errors.lateFeeAmount = amountErr
      const afterDaysErr = numberError(form.lateFeeApplyAfterDays, { required: true, min: 0, label: 'Grace days' })
      if (afterDaysErr) errors.lateFeeApplyAfterDays = afterDaysErr
      const maxErr = numberError(form.maxLateFee, { min: 0, label: 'Max late fee' })
      if (maxErr) errors.maxLateFee = maxErr
    }
    setFieldErrors(errors)
    return hasNoErrors(errors)
  }

  const handleSave = async () => {
    if (!validate()) return
    setIsSaving(true)
    setSaveError('')
    setSaved(false)

    const result = await feeService.saveSettings({
      receiptPrefix: form.receiptPrefix.trim(),
      invoicePrefix: form.invoicePrefix.trim(),
      defaultDueDay: Number(form.defaultDueDay),
      lateFeeEnabled: form.lateFeeEnabled,
      lateFeeType: form.lateFeeType,
      lateFeeAmount: form.lateFeeAmount || '0',
      lateFeeApplyAfterDays: Number(form.lateFeeApplyAfterDays || 0),
      maxLateFee: form.maxLateFee || undefined,
      autoMarkOverdue: form.autoMarkOverdue,
      allowPartialPayment: form.allowPartialPayment,
      allowAdvancePayment: form.allowAdvancePayment,
      financeIntegrationEnabled: form.financeIntegrationEnabled,
      defaultCashAccountId: form.defaultCashAccountId || undefined,
      defaultBankAccountId: form.defaultBankAccountId || undefined,
      defaultFeeIncomeAccountId: form.defaultFeeIncomeAccountId || undefined,
      defaultReceivableAccountId: form.defaultReceivableAccountId || undefined,
    })

    setIsSaving(false)
    if (result.error || !result.data) {
      setSaveError(result.error || 'Failed to save fee settings')
      return
    }
    setForm(settingsToForm(result.data))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const accountOptions = [
    { value: NONE, label: 'None selected' },
    ...glAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  ]

  const accountPicker = (label: string, key: 'defaultCashAccountId' | 'defaultBankAccountId' | 'defaultFeeIncomeAccountId' | 'defaultReceivableAccountId') => (
    <div>
      <Label>{label}</Label>
      <Combobox
        value={form[key] || NONE}
        onValueChange={v => set(key, v === NONE ? '' : v)}
        disabled={!canUpdate}
        options={accountOptions}
        placeholder="Select account"
        searchPlaceholder="Search accounts…"
        emptyText="No accounts found."
        className="mt-1"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Settings"
        description="Numbering, late fees, payment rules, and finance integration for the fees module"
      />

      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
      {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}
      {saved && <Alert><AlertDescription>Settings saved.</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Numbering & Due Dates</CardTitle>
          <CardDescription>Prefixes for generated documents and the default monthly due day.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Receipt Prefix <span className="text-destructive">*</span></Label>
              <Input
                value={form.receiptPrefix}
                onChange={e => set('receiptPrefix', e.target.value)}
                disabled={!canUpdate}
                placeholder="FEE-RCP"
                className={`mt-1 ${fieldErrors.receiptPrefix ? 'border-destructive' : ''}`}
              />
              {fieldErrors.receiptPrefix && <p className="text-xs text-destructive mt-1">{fieldErrors.receiptPrefix}</p>}
            </div>
            <div>
              <Label>Invoice Prefix <span className="text-destructive">*</span></Label>
              <Input
                value={form.invoicePrefix}
                onChange={e => set('invoicePrefix', e.target.value)}
                disabled={!canUpdate}
                placeholder="FEE-INV"
                className={`mt-1 ${fieldErrors.invoicePrefix ? 'border-destructive' : ''}`}
              />
              {fieldErrors.invoicePrefix && <p className="text-xs text-destructive mt-1">{fieldErrors.invoicePrefix}</p>}
            </div>
            <div>
              <Label>Default Due Day <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.defaultDueDay}
                onChange={e => set('defaultDueDay', e.target.value)}
                disabled={!canUpdate}
                className={`mt-1 ${fieldErrors.defaultDueDay ? 'border-destructive' : ''}`}
              />
              {fieldErrors.defaultDueDay && <p className="text-xs text-destructive mt-1">{fieldErrors.defaultDueDay}</p>}
              <p className="text-xs text-muted-foreground mt-1">Day of the month invoices fall due (1–31)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlarmClock className="h-5 w-5" /> Late Fees & Overdue</CardTitle>
          <CardDescription>Automatic late-fee charges on overdue invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable Late Fees</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Charge a late fee on invoices that pass their due date</p>
            </div>
            <Switch checked={form.lateFeeEnabled} onCheckedChange={v => set('lateFeeEnabled', v)} disabled={!canUpdate} />
          </div>

          {form.lateFeeEnabled && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Late Fee Type</Label>
                <Select value={form.lateFeeType} onValueChange={v => set('lateFeeType', v as LateFeeType)} disabled={!canUpdate}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.lateFeeType === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount'} <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={form.lateFeeAmount}
                  onChange={e => set('lateFeeAmount', e.target.value)}
                  disabled={!canUpdate}
                  placeholder="100.00"
                  className={`mt-1 ${fieldErrors.lateFeeAmount ? 'border-destructive' : ''}`}
                />
                {fieldErrors.lateFeeAmount && <p className="text-xs text-destructive mt-1">{fieldErrors.lateFeeAmount}</p>}
              </div>
              <div>
                <Label>Apply After (days) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={form.lateFeeApplyAfterDays}
                  onChange={e => set('lateFeeApplyAfterDays', e.target.value)}
                  disabled={!canUpdate}
                  className={`mt-1 ${fieldErrors.lateFeeApplyAfterDays ? 'border-destructive' : ''}`}
                />
                {fieldErrors.lateFeeApplyAfterDays && <p className="text-xs text-destructive mt-1">{fieldErrors.lateFeeApplyAfterDays}</p>}
                <p className="text-xs text-muted-foreground mt-1">Grace period after the due date</p>
              </div>
              <div>
                <Label>Max Late Fee</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxLateFee}
                  onChange={e => set('maxLateFee', e.target.value)}
                  disabled={!canUpdate}
                  placeholder="1000.00"
                  className={`mt-1 ${fieldErrors.maxLateFee ? 'border-destructive' : ''}`}
                />
                {fieldErrors.maxLateFee && <p className="text-xs text-destructive mt-1">{fieldErrors.maxLateFee}</p>}
                <p className="text-xs text-muted-foreground mt-1">Cap per invoice (optional)</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Auto-mark Overdue</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically flip issued invoices to OVERDUE once past due</p>
            </div>
            <Switch checked={form.autoMarkOverdue} onCheckedChange={v => set('autoMarkOverdue', v)} disabled={!canUpdate} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Payment Rules</CardTitle>
          <CardDescription>What kinds of payments the cashier may accept.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Allow Partial Payment</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Accept payments smaller than the invoice balance</p>
            </div>
            <Switch checked={form.allowPartialPayment} onCheckedChange={v => set('allowPartialPayment', v)} disabled={!canUpdate} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Allow Advance Payment</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Accept payments before an invoice is issued</p>
            </div>
            <Switch checked={form.allowAdvancePayment} onCheckedChange={v => set('allowAdvancePayment', v)} disabled={!canUpdate} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Finance Integration</CardTitle>
          <CardDescription>
            When enabled, fee activity posts journal entries to the general ledger using the accounts below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable Finance Integration</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Post invoices and payments to the GL automatically</p>
            </div>
            <Switch checked={form.financeIntegrationEnabled} onCheckedChange={v => set('financeIntegrationEnabled', v)} disabled={!canUpdate} />
          </div>

          {form.financeIntegrationEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              {accountPicker('Cash Account', 'defaultCashAccountId')}
              {accountPicker('Bank Account', 'defaultBankAccountId')}
              {accountPicker('Fee Income Account', 'defaultFeeIncomeAccountId')}
              {accountPicker('Receivable Account', 'defaultReceivableAccountId')}
            </div>
          )}
        </CardContent>
      </Card>

      {canUpdate && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      )}
    </div>
  )
}
