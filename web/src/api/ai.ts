import { api } from './client.js'
import type { AdvisorAdvice } from '@outflow/shared'

export function getAdvisorAdvice(month?: string) {
  const query = month ? `?month=${month}` : ''
  return api.get<{ advice: AdvisorAdvice }>(`/ai/advisor${query}`)
}

export function recategorizeTransactions() {
  return api.post<{ updated: number }>('/ai/recategorize', {})
}
