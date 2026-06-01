import { api } from './client.js'
import type { Category, CategoryRule } from '@outflow/shared'

export function getCategories() {
  return api.get<Category[]>('/categories')
}

export function createCategory(data: { nameHe: string; icon?: string; color?: string }) {
  return api.post<Category>('/categories', data)
}

export function updateCategory(id: string, data: Partial<{ nameHe: string; icon: string; color: string }>) {
  return api.patch<Category>(`/categories/${id}`, data)
}

export function getCategoryRules() {
  return api.get<CategoryRule[]>('/categories/rules')
}

export function createCategoryRule(data: {
  categoryId: string
  pattern: string
  patternType: string
  priority?: number
}) {
  return api.post<CategoryRule>('/categories/rules', data)
}

export function deleteCategoryRule(id: string) {
  return api.delete<{ deleted: boolean }>(`/categories/rules/${id}`)
}
