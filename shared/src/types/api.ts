export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}

export interface User {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}
