'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { AccessDenied } from '@/components/ui/access-denied'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { inventoryService, type InventorySettings, type BudgetEnforcement } from '@/lib/services/inventory'
import { financeService, type GlAccount } from '@/lib/services/finance'
import { Loader2, Save, Settings2 } from 'lucide-react'
import { OverviewPageSkeleton } from '@/components/ui/page-skeleton'

const NONE = '__none__'

const BUDGET_OPTIONS: Array<{ value: BudgetEnforcement; label: string; description: string }> = [
  { value: 'OFF', label: 'Off', description: 'No budget checks on inventory activity' },
  { value: 'ON_PURCHASE', label: 'On Purchase', description: 'Check budget when goods are received (GRN)' },
  { value: 'ON_ISSUE', label: 'On Issue', description: 'Check budget when stock is issued out' },
  { value: 'BOTH', label: 'Both', description: 'Check budget on both purchase and issue' },
]

export default function InventorySettingsPage() {
  const { can } = useAuth()
  const canUpdate = can('inventory.settings.update')

  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const [glIntegrationEnabled, setGlIntegrationEnabled] = useState(false)
  const [budgetEnforcement, setBudgetEnforcement] = useState<BudgetEnforcement>('ON_ISSUE')
  const [assetAccountId, setAssetAccountId] = useState('')
  const [consumptionAccountId, setConsumptionAccountId] = useState('')

  const applySettings = (settings: InventorySettings | null) => {
    if (!settings) return
    setGlIntegrationEnabled(!!settings.glIntegrationEnabled)
    setBudgetEnforcement(settings.budgetEnforcement ?? 'ON_ISSUE')
    setAssetAccountId(settings.assetAccountId ?? '')
    setConsumptionAccountId(settings.consumptionAccountId ?? '')
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [settings, accounts] = await Promise.all([
        inventoryService.getSettings(),
        financeService.getGLAccounts({ isActive: true }),
      ])
      applySettings(settings)
      setGlAccounts(accounts)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (!can('inventory.settings.read')) return <AccessDenied />

  if (isLoading) return <OverviewPageSkeleton />

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError('')
    setSaved(false)

    const result = await inventoryService.updateSettings({
      glIntegrationEnabled,
      budgetEnforcement,
      assetAccountId: assetAccountId || undefined,
      consumptionAccountId: consumptionAccountId || undefined,
    })

    setIsSaving(false)
    if (result.error || !result.data) {
      setSaveError(result.error || 'Failed to save settings')
      return
    }
    applySettings(result.data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Settings"
        description="Configure GL integration and budget enforcement for the inventory module"
      />

      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
      {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}
      {saved && <Alert><AlertDescription>Settings saved.</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Accounting Integration</CardTitle>
          <CardDescription>
            When enabled, stock-in posts Dr Inventory Asset and issues post Dr Consumption Expense. When off, inventory tracks quantities only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable GL Integration</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Posts journal entries to the general ledger for stock movements</p>
            </div>
            <Switch checked={glIntegrationEnabled} onCheckedChange={setGlIntegrationEnabled} disabled={!canUpdate} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Inventory Asset Account {glIntegrationEnabled && <span className="text-destructive">*</span>}</Label>
              <Combobox
                value={assetAccountId || NONE}
                onValueChange={v => setAssetAccountId(v === NONE ? '' : v)}
                disabled={!canUpdate}
                options={[
                  { value: NONE, label: 'None selected' },
                  ...glAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` })),
                ]}
                placeholder="Select account"
                searchPlaceholder="Search accounts…"
                emptyText="No accounts found."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Consumption Expense Account {glIntegrationEnabled && <span className="text-destructive">*</span>}</Label>
              <Combobox
                value={consumptionAccountId || NONE}
                onValueChange={v => setConsumptionAccountId(v === NONE ? '' : v)}
                disabled={!canUpdate}
                options={[
                  { value: NONE, label: 'None selected' },
                  ...glAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` })),
                ]}
                placeholder="Select account"
                searchPlaceholder="Search accounts…"
                emptyText="No accounts found."
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Enforcement</CardTitle>
          <CardDescription>Choose when inventory activity is checked against budget allocations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUDGET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                disabled={!canUpdate}
                onClick={() => setBudgetEnforcement(opt.value)}
                className={`text-left rounded-lg border p-3 transition-colors disabled:cursor-not-allowed ${
                  budgetEnforcement === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
              </button>
            ))}
          </div>
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
