import { api } from './client.js'
import type { Account } from '@outflow/shared'

export function getAccounts() {
  return api.get<Account[]>('/accounts')
}

export function addAccount(data: {
  companyId: string
  accountName: string
  credentials: Record<string, string>
}) {
  return api.post<Account>('/accounts', data)
}

export function deleteAccount(id: string) {
  return api.delete<{ deleted: boolean }>(`/accounts/${id}`)
}

export function syncAccount(id: string) {
  return api.post<{ queued: boolean; syncId: string }>(`/accounts/${id}/sync`, {})
}

export function getSyncStatus(id: string, syncId: string) {
  return api.get<{
    state: 'pending' | 'running' | 'done' | 'error'
    message?: string
    syncedCount?: number
    finishedAt?: string
  }>(`/accounts/${id}/sync-status?syncId=${syncId}`)
}
