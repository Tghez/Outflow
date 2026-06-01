import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { apiError } from '../lib/response.js'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      apiError(res, message, 400, 'VALIDATION_ERROR')
      return
    }
    req.body = result.data
    next()
  }
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ')
      apiError(res, message, 400, 'VALIDATION_ERROR')
      return
    }
    req.query = result.data as typeof req.query
    next()
  }
}
