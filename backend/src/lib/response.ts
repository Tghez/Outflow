import type { Response } from 'express'

export function apiSuccess<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ ok: true, data })
}

export function apiError(
  res: Response,
  error: string,
  status = 400,
  code?: string,
): Response {
  return res.status(status).json({ ok: false, error, ...(code ? { code } : {}) })
}
