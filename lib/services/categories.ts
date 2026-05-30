import { tenantService } from './tenant'

export const categoryService = {
  async getIncomeHeads(tenantId: string): Promise<string[]> {
    const tenant = await tenantService.getById(tenantId)
    return tenant?.settings.incomeHeads || ['Tuition Fees', 'Other Income']
  },

  async getExpenseHeads(tenantId: string): Promise<string[]> {
    const tenant = await tenantService.getById(tenantId)
    return tenant?.settings.expenseHeads || ['Salaries', 'Utilities', 'Other Expenses']
  },

  async getAssetCategories(tenantId: string): Promise<string[]> {
    const tenant = await tenantService.getById(tenantId)
    return tenant?.settings.assetCategories || ['Buildings', 'Equipment', 'Other Assets']
  },

  async getLiabilityCategories(tenantId: string): Promise<string[]> {
    const tenant = await tenantService.getById(tenantId)
    return tenant?.settings.liabilityCategories || ['Loans', 'Other Liabilities']
  },
}
