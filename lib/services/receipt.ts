// Legacy receipt service stub — replaced by feeService.getReceipts() for real API
export const receiptService = {
  async getAllReceiptsByTenant(_tenantId: string): Promise<unknown[]> {
    return []
  },

  async getReceiptHTML(_receipt: unknown): Promise<string | null> {
    return null
  },

  async generateReceipt(_params: Record<string, unknown>): Promise<unknown | null> {
    return null
  },

  async createReceipt(_params: Record<string, unknown>): Promise<unknown | null> {
    return null
  },

  formatReceipt(_receipt: unknown): string {
    return ''
  },
}
