import { api } from './client.js'
import type { BudgetWithSpent } from '@outflow/shared'

export function getBudgets(month: string) {
  return api.get<BudgetWithSpent[]>(`/budgets/${month}`)
}

export function upsertBudget(month: string, categoryId: string, targetAmountAgorot: number) {
  return api.put<BudgetWithSpent>(`/budgets/${month}/${categoryId}`, { targetAmountAgorot })
}

export function deleteBudget(month: string, categoryId: string) {
  return api.delete<{ deleted: boolean }>(`/budgets/${month}/${categoryId}`)
}
