import { api } from './client.js'
import type { User } from '@outflow/shared'

export function login(email: string, password: string) {
  return api.post<{ token: string; user: User }>('/auth/login', { email, password })
}

export function register(email: string, password: string, displayName?: string) {
  return api.post<{ token: string; user: User }>('/auth/register', { email, password, displayName })
}

export function getMe() {
  return api.get<User>('/auth/me')
}
