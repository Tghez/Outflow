import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt.js'
import { apiError } from '../lib/response.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string
      userEmail: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    apiError(res, 'Unauthorized', 401, 'UNAUTHORIZED')
    return
  }

  const token = header.slice(7)
  try {
    const payload = verifyToken(token)
    req.userId = payload.userId
    req.userEmail = payload.email
    next()
  } catch {
    apiError(res, 'Invalid or expired token', 401, 'TOKEN_INVALID')
  }
}
