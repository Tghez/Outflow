import { api } from './client.js'
import type { MonthlyTotal, CategoryBreakdown } from '@outflow/shared'

export function getMonthlyInsights(months = 4) {
  return api.get<MonthlyTotal[]>(`/insights/monthly?months=${months}`)
}

export function getCategoryInsights(month: string) {
  return api.get<CategoryBreakdown[]>(`/insights/categories/${month}`)
}
