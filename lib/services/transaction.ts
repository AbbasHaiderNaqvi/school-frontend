import { storage, STORAGE_KEYS } from './storage'
import type { FinancialTransaction } from '../types'
import { generateId, formatDateTime } from '../utils'
import { auditService } from './audit'

export const transactionService = {
  async createTransaction(transaction: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialTransaction> {
    const newTransaction: FinancialTransaction = {
      ...transaction,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const transactions = storage.get<FinancialTransaction[]>(STORAGE_KEYS.FINANCIAL_TRANSACTIONS) || []
    transactions.push(newTransaction)
    storage.set(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, transactions)

    auditService.log({
      action: 'CREATE',
      entity: 'FinancialTransaction',
      entityId: newTransaction.id,
      details: `Created transaction: ${transaction.description} (${transaction.amount}) - ${transaction.transactionType}`,
      tenantId: transaction.tenantId,
    })

    return newTransaction
  },

  async getTransactions(tenantId: string): Promise<FinancialTransaction[]> {
    const transactions = storage.get<FinancialTransaction[]>(STORAGE_KEYS.FINANCIAL_TRANSACTIONS) || []
    return transactions
      .filter(t => t.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async getTransactionsByType(tenantId: string, type: string): Promise<FinancialTransaction[]> {
    const transactions = storage.get<FinancialTransaction[]>(STORAGE_KEYS.FINANCIAL_TRANSACTIONS) || []
    return transactions
      .filter(t => t.tenantId === tenantId && t.transactionType === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async getTransactionsByDateRange(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<FinancialTransaction[]> {
    const transactions = storage.get<FinancialTransaction[]>(STORAGE_KEYS.FINANCIAL_TRANSACTIONS) || []
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()

    return transactions
      .filter(t => {
        const transDate = new Date(t.createdAt).getTime()
        return t.tenantId === tenantId && transDate >= start && transDate <= end
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async approveTransaction(transactionId: string, approvedBy: string, approverName: string): Promise<FinancialTransaction | null> {
    const transactions = storage.get<FinancialTransaction[]>(STORAGE_KEYS.FINANCIAL_TRANSACTIONS) || []
    const index = transactions.findIndex(t => t.id === transactionId)

    if (index === -1) return null

    transactions[index] = {
      ...transactions[index],
      status: 'approved',
      approvedBy,
      approvedByName: approverName,
      updatedAt: new Date().toISOString(),
    }

    storage.set(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, transactions)

    auditService.log({
      action: 'APPROVE',
      entity: 'FinancialTransaction',
      entityId: transactionId,
      details: `Approved transaction by ${approverName}`,
      tenantId: transactions[index].tenantId,
    })

    return transactions[index]
  },

  async getTransactionSummary(
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalIncome: number
    totalExpense: number
    netAmount: number
    transactionCount: number
  }> {
    const transactions = await this.getTransactionsByDateRange(tenantId, startDate, endDate)

    let totalIncome = 0
    let totalExpense = 0

    for (const trans of transactions) {
      if (trans.transactionType === 'income') {
        totalIncome += trans.amount
      } else if (trans.transactionType === 'expense') {
        totalExpense += trans.amount
      }
    }

    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      transactionCount: transactions.length,
    }
  },
}
