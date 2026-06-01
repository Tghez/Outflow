import { api } from './client.js'
import type { Transaction, PaginatedResponse } from '@outflow/shared'

export interface TransactionFilters {
  month?: string
  categoryId?: string
  accountId?: string
  page?: number
  limit?: number
}

export function getTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams()
  if (filters.month) params.set('month', filters.month)
  if (filters.categoryId) params.set('categoryId', filters.categoryId)
  if (filters.accountId) params.set('accountId', filters.accountId)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return api.get<PaginatedResponse<Transaction>>(`/transactions${qs ? `?${qs}` : ''}`)
}

export function updateTransactionCategory(id: string, categoryId: string) {
  return api.patch<Transaction>(`/transactions/${id}`, { categoryId })
}
