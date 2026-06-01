import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import type { User } from '@outflow/shared'

interface AuthState {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('outflow_token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('outflow_user')
    return raw ? (JSON.parse(raw) as User) : null
  })

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('outflow_token', newToken)
    localStorage.setItem('outflow_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('outflow_token')
    localStorage.removeItem('outflow_user')
    setToken(null)
    setUser(null)
  }, [])

  return createElement(AuthContext.Provider, { value: { token, user, login, logout } }, children)
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
