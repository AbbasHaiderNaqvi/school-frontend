'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { tenantService } from '@/lib/services/tenant'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AccountHeadsSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [incomeHeads, setIncomeHeads] = useState<string[]>([])
  const [expenseHeads, setExpenseHeads] = useState<string[]>([])
  const [assetCategories, setAssetCategories] = useState<string[]>([])
  const [liabilityCategories, setLiabilityCategories] = useState<string[]>([])
  const [newIncome, setNewIncome] = useState('')
  const [newExpense, setNewExpense] = useState('')
  const [newAsset, setNewAsset] = useState('')
  const [newLiability, setNewLiability] = useState('')

  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    if (!user?.tenantId) return

    try {
      const tenant = await tenantService.getById(user.tenantId)
      if (tenant) {
        setIncomeHeads(tenant.settings.incomeHeads || [])
        setExpenseHeads(tenant.settings.expenseHeads || [])
        setAssetCategories(tenant.settings.assetCategories || [])
        setLiabilityCategories(tenant.settings.liabilityCategories || [])
      }
    } catch (error) {
      console.error('[v0] Error loading settings:', error)
    }
  }

  const handleSave = async () => {
    if (!user?.tenantId) return

    setLoading(true)
    try {
      const tenant = await tenantService.getById(user.tenantId)
      if (!tenant) return

      await tenantService.updateSettings(user.tenantId, {
        ...tenant.settings,
        incomeHeads,
        expenseHeads,
        assetCategories,
        liabilityCategories,
      })

      toast({
        title: 'Success',
        description: 'Account heads updated successfully',
      })
    } catch (error) {
      console.error('[v0] Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to update account heads',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const addIncomeHead = () => {
    if (newIncome.trim() && !incomeHeads.includes(newIncome.trim())) {
      setIncomeHeads([...incomeHeads, newIncome.trim()])
      setNewIncome('')
    }
  }

  const removeIncomeHead = (head: string) => {
    setIncomeHeads(incomeHeads.filter(h => h !== head))
  }

  const addExpenseHead = () => {
    if (newExpense.trim() && !expenseHeads.includes(newExpense.trim())) {
      setExpenseHeads([...expenseHeads, newExpense.trim()])
      setNewExpense('')
    }
  }

  const removeExpenseHead = (head: string) => {
    setExpenseHeads(expenseHeads.filter(h => h !== head))
  }

  const addAssetCategory = () => {
    if (newAsset.trim() && !assetCategories.includes(newAsset.trim())) {
      setAssetCategories([...assetCategories, newAsset.trim()])
      setNewAsset('')
    }
  }

  const removeAssetCategory = (category: string) => {
    setAssetCategories(assetCategories.filter(c => c !== category))
  }

  const addLiabilityCategory = () => {
    if (newLiability.trim() && !liabilityCategories.includes(newLiability.trim())) {
      setLiabilityCategories([...liabilityCategories, newLiability.trim()])
      setNewLiability('')
    }
  }

  const removeLiabilityCategory = (category: string) => {
    setLiabilityCategories(liabilityCategories.filter(c => c !== category))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Heads & Categories"
        description="Manage income heads, expense heads, and asset categories for your organization"
      />

      <div className="grid gap-6">
        {/* Income Heads */}
        <Card>
          <CardHeader>
            <CardTitle>Income Heads</CardTitle>
            <CardDescription>Define different types of income for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="e.g., Tuition Fees, Admission Fees"
                  value={newIncome}
                  onChange={(e) => setNewIncome(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addIncomeHead()}
                />
              </div>
              <Button onClick={addIncomeHead}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {incomeHeads.map((head) => (
                <Badge key={head} variant="secondary" className="px-3 py-1.5">
                  {head}
                  <button
                    onClick={() => removeIncomeHead(head)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Heads */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Heads</CardTitle>
            <CardDescription>Define different types of expenses for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="e.g., Salaries, Utilities, Rent"
                  value={newExpense}
                  onChange={(e) => setNewExpense(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExpenseHead()}
                />
              </div>
              <Button onClick={addExpenseHead}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {expenseHeads.map((head) => (
                <Badge key={head} variant="secondary" className="px-3 py-1.5">
                  {head}
                  <button
                    onClick={() => removeExpenseHead(head)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Asset Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Categories</CardTitle>
            <CardDescription>Define different types of assets for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="e.g., Buildings, Furniture, Equipment"
                  value={newAsset}
                  onChange={(e) => setNewAsset(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAssetCategory()}
                />
              </div>
              <Button onClick={addAssetCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {assetCategories.map((category) => (
                <Badge key={category} variant="secondary" className="px-3 py-1.5">
                  {category}
                  <button
                    onClick={() => removeAssetCategory(category)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Liability Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Liability Categories</CardTitle>
            <CardDescription>Define different types of liabilities for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="e.g., Loans, Pending Salaries"
                  value={newLiability}
                  onChange={(e) => setNewLiability(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLiabilityCategory()}
                />
              </div>
              <Button onClick={addLiabilityCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {liabilityCategories.map((category) => (
                <Badge key={category} variant="secondary" className="px-3 py-1.5">
                  {category}
                  <button
                    onClick={() => removeLiabilityCategory(category)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
